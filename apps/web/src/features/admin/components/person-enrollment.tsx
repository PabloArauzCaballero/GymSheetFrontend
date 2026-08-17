'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IdCard, RotateCcw, ScanFace } from 'lucide-react';
import { useState } from 'react';
import { notify } from '@/shared/notifications';
import { accessAdminService } from '@/features/admin/services/access-admin-service';
import { membershipAdminService } from '@/features/admin/services/membership-admin-service';
import {
  EnrolledPersonSummary,
  PersonDetailsForm,
  type EnrolledPerson,
} from './person-details-form';
import type { CapturedFrame } from '@/shared/lib/camera/camera-adapter';
import type { FaceDetection } from '@/shared/lib/camera/face-detector';
import { queryKeys } from '@/shared/api/query-keys';
import { CameraCapture } from '@/shared/components/media/camera-capture';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';

/**
 * Versión del texto de consentimiento biométrico que se está firmando. Viaja
 * con la credencial para que una revisión posterior sepa qué aceptó la persona.
 */
const CONSENT_VERSION = 'consentimiento-biometrico-v1';

/**
 * Proveedor declarado en la credencial. La captura ocurre en la cámara del
 * computador de recepción, no en un lector externo, y el registro debe decirlo.
 */
const FACE_PROVIDER = 'WEBCAM_RECEPCION';

type Capture = {
  readonly frame: CapturedFrame;
  readonly detection: FaceDetection | null;
};

/**
 * Alta de una persona con credencial facial desde la cámara del computador.
 *
 * Sobre el dato biométrico: **la fotografía nunca sale del navegador**. Al
 * backend viaja solo una referencia de inscripción irrepetible, el checksum de
 * la toma y la evidencia del consentimiento —el contrato que ya usaba el módulo
 * de credenciales externas—. Esta pantalla acredita que la inscripción se hizo,
 * con qué encuadre y bajo qué consentimiento; no verifica identidad.
 */
export function PersonEnrollment() {
  const [enrolled, setEnrolled] = useState<EnrolledPerson | null>(null);
  const [capture, setCapture] = useState<Capture | null>(null);
  const [consent, setConsent] = useState(false);
  const [existingUserId, setExistingUserId] = useState('');
  const queryClient = useQueryClient();

  const plans = useQuery({
    queryKey: queryKeys.admin.plans,
    queryFn: membershipAdminService.listPlans,
  });

  const createPerson = useMutation({
    mutationFn: async (form: FormData) => {
      const customer = await membershipAdminService.createCustomer({
        email: String(form.get('email')),
        password: String(form.get('password')),
        pinAcceso: String(form.get('pinAcceso')),
        nombreCompleto: String(form.get('nombreCompleto')),
        numeroCliente: String(form.get('numeroCliente')),
        telefono: String(form.get('telefono') || '') || null,
        notas: String(form.get('notas') || '') || null,
      });
      const planId = String(form.get('planId') || '');
      if (planId) {
        await membershipAdminService.createMembership({
          clienteUsuarioId: customer.usuarioId,
          planId,
        });
      }
      return customer;
    },
    onSuccess: async (customer) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'customers'], exact: false });
      setEnrolled({
        usuarioId: customer.usuarioId,
        nombre: customer.usuario?.nombreCompleto ?? 'Persona registrada',
        numeroCliente: customer.numeroCliente,
      });
      notify.success('Persona registrada. Continúa con la credencial facial.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const registerFace = useMutation({
    mutationFn: ({ usuarioId, frame, detection }: { usuarioId: string } & Capture) =>
      accessAdminService.createExternalCredential({
        usuarioId,
        modalidad: 'FACE',
        proveedor: FACE_PROVIDER,
        // Referencia de inscripción: identifica la credencial sin contener
        // nada derivado del rostro.
        referenciaExterna: `face-${crypto.randomUUID()}`,
        versionConsentimiento: CONSENT_VERSION,
        consentimientoRegistradoEn: new Date().toISOString(),
        metadata: {
          capturaChecksumSha256: frame.checksum,
          capturaAncho: frame.width,
          capturaAlto: frame.height,
          deteccion: detection
            ? {
                estrategia: detection.strategy,
                rostros: detection.faces.length,
                confianza: Number(detection.confidence.toFixed(2)),
              }
            : null,
        },
      }),
    onSuccess: async (_credential, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'credentials', variables.usuarioId],
      });
      notify.success('Credencial facial registrada.');
      setCapture(null);
      setConsent(false);
    },
    onError: (error: Error) => notify.error(error),
  });

  const targetUserId = enrolled?.usuarioId ?? existingUserId.trim();
  const detection = capture?.detection ?? null;
  const singleFace = detection?.faces.length === 1;

  return (
    <div className="grid gap-8">
      <PageHeader
        description="Alta de la persona y registro de su credencial facial con la cámara del computador. La fotografía no se transmite: al servidor solo viaja la referencia de inscripción, el checksum de la toma y la evidencia del consentimiento."
        eyebrow="Control de acceso"
        title="Registrar persona"
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            description="Crea la cuenta, el número de cliente y el PIN. Opcionalmente activa una membresía en el mismo paso."
            title="1 · Datos de la persona"
          />
          <CardContent>
            {enrolled ? (
              <EnrolledPersonSummary
                onReset={() => {
                  setEnrolled(null);
                  setCapture(null);
                  setConsent(false);
                }}
                person={enrolled}
              />
            ) : (
              <>
                <PersonDetailsForm
                  loading={createPerson.isPending}
                  onSubmit={(form) => createPerson.mutate(form)}
                  plans={plans.data ?? []}
                />
                <div className="mt-6 border-t border-[var(--border-subtle)] pt-5">
                  <Field
                    hint="¿La persona ya existe? Pega su UUID para registrarle solo la credencial facial."
                    htmlFor="existing-user"
                    label="Usuario existente"
                  >
                    <Input
                      id="existing-user"
                      onChange={(event) => setExistingUserId(event.target.value)}
                      placeholder="UUID de usuario"
                      value={existingUserId}
                    />
                  </Field>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            description="Encuadra un solo rostro, con luz frontal y sin gafas de sol."
            title="2 · Captura facial"
          />
          <CardContent>
            {capture ? (
              <div className="grid gap-4">
                <div className="overflow-hidden rounded-[4px] border border-[var(--border-subtle)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Vista previa local, nunca se transmite. */}
                  <img
                    alt="Captura para la inscripción facial"
                    className="w-full object-cover"
                    src={capture.frame.dataUrl}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Badge tone={singleFace ? 'success' : 'warning'}>
                    {detection
                      ? `${detection.faces.length} rostro(s) · ${detection.strategy === 'native' ? 'detector del navegador' : 'detección asistida'}`
                      : 'Sin análisis de rostro'}
                  </Badge>
                  <span>
                    {capture.frame.width} × {capture.frame.height} px · sha256{' '}
                    {capture.frame.checksum.slice(0, 12)}…
                  </span>
                </div>
                {!singleFace ? (
                  <p className="text-sm text-[var(--warning-text)]">
                    La captura no muestra exactamente un rostro. Puedes repetirla o continuar bajo
                    tu criterio.
                  </p>
                ) : null}
                <Button onClick={() => setCapture(null)} variant="ghost">
                  <RotateCcw className="size-4" />
                  Repetir captura
                </Button>
              </div>
            ) : (
              <CameraCapture
                captureLabel="Capturar rostro"
                detectFace
                onCapture={(frame, faceDetection) =>
                  setCapture({ frame, detection: faceDetection })
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader
          description={`Se registra la credencial de modalidad FACE con proveedor ${FACE_PROVIDER}. La imagen se descarta al salir de esta pantalla.`}
          title="3 · Consentimiento y registro"
        />
        <CardContent>
          <div className="grid gap-5">
            <label className="flex items-start gap-3 text-sm">
              <input
                checked={consent}
                className="mt-1 size-4 accent-[var(--volt)]"
                onChange={(event) => setConsent(event.target.checked)}
                type="checkbox"
              />
              <span>
                La persona fue informada del uso de reconocimiento facial para el control de acceso
                y otorgó su consentimiento ({CONSENT_VERSION}).
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={!targetUserId || !capture || !consent}
                loading={registerFace.isPending}
                onClick={() =>
                  capture &&
                  registerFace.mutate({
                    usuarioId: targetUserId,
                    frame: capture.frame,
                    detection: capture.detection,
                  })
                }
                variant="primary"
              >
                <ScanFace className="size-4" />
                Registrar credencial facial
              </Button>
              {!targetUserId ? (
                <span className="text-sm text-[var(--text-muted)]">
                  Registra la persona o indica un UUID existente.
                </span>
              ) : null}
              {targetUserId && !capture ? (
                <span className="text-sm text-[var(--text-muted)]">Falta la captura facial.</span>
              ) : null}
              {targetUserId && capture && !consent ? (
                <span className="text-sm text-[var(--text-muted)]">
                  Falta confirmar el consentimiento.
                </span>
              ) : null}
            </div>
            <p className="flex items-start gap-2 text-xs text-[var(--text-muted)]">
              <IdCard aria-hidden className="mt-0.5 size-4 shrink-0" />
              El acceso efectivo lo concede el dispositivo del torniquete al reconocer la
              credencial. Esta pantalla registra la inscripción, no verifica identidad.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
