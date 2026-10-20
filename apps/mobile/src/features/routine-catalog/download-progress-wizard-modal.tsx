import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { BadgePop, PressableScale } from '@/components/motion';
import { Button } from '@/components/ui';
import { exportRoutineProgress, RoutineProgressExportFilters } from '@/lib/export-progress';
import { notify } from '@/notifications';
import { colors, fontSizes, iconSizes, radii, semibold, spacing } from '@/theme';
import { routineService } from '@/api/services';

interface DownloadProgressWizardModalProps {
  visible: boolean;
  onClose: () => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

export function DownloadProgressWizardModal({
  visible,
  onClose,
}: DownloadProgressWizardModalProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [format, setFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');
  const [routineId, setRoutineId] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<'ALL' | 'LAST_30' | 'LAST_90' | 'LAST_YEAR'>('ALL');
  const [includeHistory, setIncludeHistory] = useState(true);
  const [includeTargets, setIncludeTargets] = useState(true);
  const [includePrograms, setIncludePrograms] = useState(true);

  const [downloading, setDownloading] = useState(false);
  const [successResult, setSuccessResult] = useState<{ fileName: string; recordsCount: number } | null>(null);

  // Obtener rutinas del usuario para el paso 2
  const routinesQuery = useQuery({
    queryKey: ['routines', 'list', 'mine'],
    queryFn: () => routineService.list(),
    enabled: visible,
  });

  type RoutineItem = {
    id: string;
    nombre: string;
    objetivo?: string | null;
    duracionSemanas?: number | null;
  };
  const routines: RoutineItem[] = (routinesQuery.data?.items as RoutineItem[]) ?? [];

  const handleReset = () => {
    setStep(1);
    setFormat('excel');
    setRoutineId('ALL');
    setDatePreset('ALL');
    setIncludeHistory(true);
    setIncludeTargets(true);
    setIncludePrograms(true);
    setSuccessResult(null);
    setDownloading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const executeDownload = async (overrideFilters?: Partial<RoutineProgressExportFilters>) => {
    const finalFilters: RoutineProgressExportFilters = {
      format: overrideFilters?.format ?? format,
      routineId: overrideFilters?.routineId ?? routineId,
      datePreset: overrideFilters?.datePreset ?? datePreset,
      includeHistory: overrideFilters?.includeHistory ?? includeHistory,
      includeTargets: overrideFilters?.includeTargets ?? includeTargets,
      includePrograms: overrideFilters?.includePrograms ?? includePrograms,
    };

    setDownloading(true);
    try {
      const res = await exportRoutineProgress(finalFilters);
      if (res.status === 'saved') {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        setSuccessResult({
          fileName: res.fileName,
          recordsCount: res.recordsCount,
        });
      } else if (res.status === 'cancelled') {
        notify.info('Descarga cancelada.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo generar la descarga.';
      notify.error({ title: 'Error al exportar', message });
    } finally {
      setDownloading(false);
    }
  };

  // Botón "Descargar todo el historial": Salta todos los filtros restantes y descarga inmediatamente con todos los datos
  const handleDownloadAllHistory = () => {
    void executeDownload({
      format,
      routineId: 'ALL',
      datePreset: 'ALL',
      includeHistory: true,
      includeTargets: true,
      includePrograms: true,
    });
  };

  // Botón "Saltar": establece el campo del paso actual en "todos los datos posibles" y avanza
  const handleSkipCurrentStep = () => {
    if (step === 1) {
      setFormat('excel');
      setStep(2);
    } else if (step === 2) {
      setRoutineId('ALL');
      setStep(3);
    } else if (step === 3) {
      setDatePreset('ALL');
      setStep(4);
    } else if (step === 4) {
      setIncludeHistory(true);
      setIncludeTargets(true);
      setIncludePrograms(true);
      setStep(5);
    }
  };

  // Vista de éxito con microanimación
  if (successResult) {
    return (
      <BottomSheet
        onClose={handleClose}
        testID="download-success-sheet"
        title="Descarga completada"
        visible={visible}
      >
        <View style={{ alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.md }}>
          <BadgePop value="success">
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                backgroundColor: colors.voltDim,
                borderWidth: 2,
                borderColor: colors.volt,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: colors.volt,
                shadowOpacity: 0.35,
                shadowRadius: 16,
              }}
            >
              <Ionicons color={colors.volt} name="checkmark-circle" size={48} />
            </View>
          </BadgePop>

          <Text
            style={{
              color: colors.text,
              fontSize: fontSizes.lg,
              fontWeight: semibold,
              textAlign: 'center',
            }}
          >
            ¡Progreso descargado con éxito!
          </Text>

          <Text
            style={{
              color: colors.textMuted,
              fontSize: fontSizes.sm,
              textAlign: 'center',
              lineHeight: 20,
              paddingHorizontal: spacing.md,
            }}
          >
            El archivo se ha generado con todos los datos seleccionados y guardado en tu dispositivo. Tu descarga quedó registrada de forma auditable.
          </Text>

          <View
            style={{
              width: '100%',
              backgroundColor: colors.surfaceHigh,
              borderRadius: radii.lg,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              marginTop: spacing.xs,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: radii.md,
                backgroundColor: colors.surfaceLow,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                color={colors.volt}
                name={format === 'excel' ? 'grid-outline' : format === 'pdf' ? 'document-outline' : 'document-text-outline'}
                size={24}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: semibold }}
              >
                {successResult.fileName}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                {successResult.recordsCount} filas exportadas · {format.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={{ width: '100%', marginTop: spacing.md }}>
            <Button label="Listo" onPress={handleClose} variant="primary" />
          </View>
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      onClose={handleClose}
      subtitle={`Paso ${step} de 5 · Filtros opcionales`}
      testID="download-wizard-sheet"
      title="Descargar progreso"
      visible={visible}
    >
      <View style={{ gap: spacing.md }}>
        {/* Barra superior de atajo: Descargar todo el historial */}
        {step < 5 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.surfaceHigh,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs + 2,
              borderRadius: radii.full,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
              ¿Quieres todo sin filtros?
            </Text>
            <PressableScale
              accessibilityLabel="Descargar todo el historial ahora"
              onPress={handleDownloadAllHistory}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: spacing.sm,
                paddingVertical: 4,
                borderRadius: radii.full,
                backgroundColor: colors.voltDim,
              }}
            >
              <Ionicons color={colors.volt} name="flash-outline" size={14} />
              <Text style={{ color: colors.volt, fontSize: fontSizes.xs, fontWeight: '700' }}>
                Descargar todo el historial
              </Text>
            </PressableScale>
          </View>
        )}

        {/* FASE 1: FORMATO */}
        {step === 1 && (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
              1. Selecciona el formato de descarga
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
              Puedes descargarlo como una hoja de cálculo estándar para Excel, CSV para importar en otras herramientas o un informe PDF con diseño.
            </Text>

            <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
              {[
                {
                  key: 'excel' as const,
                  title: 'Excel (.xlsx)',
                  desc: 'Hoja de cálculo completa con formato profesional, filtros automáticos y pestañas de resumen.',
                  icon: 'grid-outline' as const,
                  badge: 'Recomendado',
                },
                {
                  key: 'csv' as const,
                  title: 'CSV (.csv)',
                  desc: 'Texto delimitado con UTF-8 BOM para abrir directamente en cualquier hoja o sistema.',
                  icon: 'document-text-outline' as const,
                },
                {
                  key: 'pdf' as const,
                  title: 'PDF (.pdf)',
                  desc: 'Documento visual con estética GymSheet oscura, tarjetas de métricas y listados.',
                  icon: 'document-outline' as const,
                },
              ].map((item) => {
                const selected = format === item.key;
                return (
                  <PressableScale
                    accessibilityLabel={item.title}
                    key={item.key}
                    onPress={() => setFormat(item.key)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      padding: spacing.md,
                      borderRadius: radii.lg,
                      borderWidth: selected ? 1.5 : 1,
                      borderColor: selected ? colors.volt : colors.border,
                      backgroundColor: selected ? colors.voltDim : colors.surfaceHigh,
                    }}
                  >
                    <Ionicons
                      color={selected ? colors.volt : colors.textMuted}
                      name={item.icon}
                      size={24}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                        <Text
                          style={{
                            color: selected ? colors.volt : colors.text,
                            fontSize: fontSizes.sm,
                            fontWeight: semibold,
                          }}
                        >
                          {item.title}
                        </Text>
                        {item.badge && (
                          <View
                            style={{
                              backgroundColor: colors.volt,
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: radii.full,
                            }}
                          >
                            <Text
                              style={{ color: '#101010', fontSize: 10, fontWeight: '800' }}
                            >
                              {item.badge}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                        {item.desc}
                      </Text>
                    </View>
                    <Ionicons
                      color={selected ? colors.volt : colors.textMuted}
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                    />
                  </PressableScale>
                );
              })}
            </View>
          </View>
        )}

        {/* FASE 2: RUTINAS */}
        {step === 2 && (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
              2. Selecciona qué rutinas deseas incluir
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
              Por defecto se incluyen todas tus rutinas y programas activos. Puedes elegir una en específico.
            </Text>

            <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
              <PressableScale
                accessibilityLabel="Todas las rutinas"
                onPress={() => setRoutineId('ALL')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.md,
                  borderRadius: radii.lg,
                  borderWidth: routineId === 'ALL' ? 1.5 : 1,
                  borderColor: routineId === 'ALL' ? colors.volt : colors.border,
                  backgroundColor: routineId === 'ALL' ? colors.voltDim : colors.surfaceHigh,
                }}
              >
                <Ionicons
                  color={routineId === 'ALL' ? colors.volt : colors.textMuted}
                  name="albums-outline"
                  size={22}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: routineId === 'ALL' ? colors.volt : colors.text,
                      fontSize: fontSizes.sm,
                      fontWeight: semibold,
                    }}
                  >
                    Todas mis rutinas y programas
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                    Todos los datos posibles en este campo
                  </Text>
                </View>
                <Ionicons
                  color={routineId === 'ALL' ? colors.volt : colors.textMuted}
                  name={routineId === 'ALL' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                />
              </PressableScale>

              {routines.map((r) => {
                const selected = routineId === r.id;
                return (
                  <PressableScale
                    accessibilityLabel={r.nombre}
                    key={r.id}
                    onPress={() => setRoutineId(r.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      padding: spacing.md,
                      borderRadius: radii.lg,
                      borderWidth: selected ? 1.5 : 1,
                      borderColor: selected ? colors.volt : colors.border,
                      backgroundColor: selected ? colors.voltDim : colors.surfaceHigh,
                    }}
                  >
                    <Ionicons
                      color={selected ? colors.volt : colors.textMuted}
                      name="barbell-outline"
                      size={22}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: selected ? colors.volt : colors.text,
                          fontSize: fontSizes.sm,
                          fontWeight: semibold,
                        }}
                      >
                        {r.nombre}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                        Objetivo: {r.objetivo || 'General'} · {r.duracionSemanas ?? '—'} sem
                      </Text>
                    </View>
                    <Ionicons
                      color={selected ? colors.volt : colors.textMuted}
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                    />
                  </PressableScale>
                );
              })}
            </View>
          </View>
        )}

        {/* FASE 3: PERÍODO */}
        {step === 3 && (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
              3. Rango de fechas e historial
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
              Define el alcance temporal de las sesiones y series registradas.
            </Text>

            <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
              {[
                {
                  key: 'ALL' as const,
                  title: 'Todo el historial',
                  desc: 'Desde tu primer entrenamiento hasta hoy sin restricciones.',
                  icon: 'infinite-outline' as const,
                },
                {
                  key: 'LAST_30' as const,
                  title: 'Último mes (30 días)',
                  desc: 'Las sesiones y series de los últimos 30 días.',
                  icon: 'calendar-outline' as const,
                },
                {
                  key: 'LAST_90' as const,
                  title: 'Últimos 3 meses (90 días)',
                  desc: 'Historial del trimestre más reciente.',
                  icon: 'calendar-number-outline' as const,
                },
                {
                  key: 'LAST_YEAR' as const,
                  title: 'Último año',
                  desc: 'Los últimos 365 días de entrenamiento.',
                  icon: 'time-outline' as const,
                },
              ].map((item) => {
                const selected = datePreset === item.key;
                return (
                  <PressableScale
                    accessibilityLabel={item.title}
                    key={item.key}
                    onPress={() => setDatePreset(item.key)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      padding: spacing.md,
                      borderRadius: radii.lg,
                      borderWidth: selected ? 1.5 : 1,
                      borderColor: selected ? colors.volt : colors.border,
                      backgroundColor: selected ? colors.voltDim : colors.surfaceHigh,
                    }}
                  >
                    <Ionicons
                      color={selected ? colors.volt : colors.textMuted}
                      name={item.icon}
                      size={22}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: selected ? colors.volt : colors.text,
                          fontSize: fontSizes.sm,
                          fontWeight: semibold,
                        }}
                      >
                        {item.title}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                        {item.desc}
                      </Text>
                    </View>
                    <Ionicons
                      color={selected ? colors.volt : colors.textMuted}
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                    />
                  </PressableScale>
                );
              })}
            </View>
          </View>
        )}

        {/* FASE 4: DIMENSIONES Y CAMPOS DEL SISTEMA DE RUTINAS */}
        {step === 4 && (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
              4. Campos del sistema de rutinas
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
              La exportación incluye todas las dimensiones del sistema de rutinas de GymSheet:
            </Text>

            <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
              {[
                {
                  title: 'Metadatos y Autoría de Rutina',
                  desc: 'Nombre, descripción, objetivo, visibilidad, duración, versión, sello oficial y autoría.',
                  active: true,
                },
                {
                  title: 'Estructura de Días y Ejercicios',
                  desc: 'Día de la semana, orden, grupo muscular, músculo objetivo, tipo y equipamiento.',
                  active: includeTargets,
                  toggle: () => setIncludeTargets((v) => !v),
                },
                {
                  title: 'Prescripción de Entrenamiento',
                  desc: 'Series objetivo, rangos de reps, cargas prescritas en kg, RIR, descansos y notas.',
                  active: includeTargets,
                  toggle: () => setIncludeTargets((v) => !v),
                },
                {
                  title: 'Sobrecarga Progresiva y Programas',
                  desc: 'Modo de sobrecarga, multiplicadores de senda, 1RM estimado, marcas meta y fallos.',
                  active: includePrograms,
                  toggle: () => setIncludePrograms((v) => !v),
                },
                {
                  title: 'Historial de Ejecución y Series Reales',
                  desc: 'Sesiones, fechas, duraciones, series completadas, reps reales, peso levantado y volumen.',
                  active: includeHistory,
                  toggle: () => setIncludeHistory((v) => !v),
                },
              ].map((dim, idx) => (
                <PressableScale
                  accessibilityLabel={dim.title}
                  key={idx}
                  onPress={dim.toggle ? dim.toggle : undefined}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.md,
                    borderRadius: radii.lg,
                    borderWidth: 1,
                    borderColor: dim.active ? colors.border : colors.border,
                    backgroundColor: colors.surfaceHigh,
                  }}
                >
                  <Ionicons
                    color={dim.active ? colors.volt : colors.textMuted}
                    name={dim.active ? 'checkbox' : 'square-outline'}
                    size={22}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: fontSizes.sm,
                        fontWeight: semibold,
                      }}
                    >
                      {dim.title}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 16 }}>
                      {dim.desc}
                    </Text>
                  </View>
                </PressableScale>
              ))}
            </View>
          </View>
        )}

        {/* FASE 5: RESUMEN Y DESCARGA FINAL */}
        {step === 5 && (
          <View style={{ gap: spacing.md }}>
            <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
              5. Confirmación de descarga
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
              Revisa los parámetros antes de generar el archivo. Tu descarga quedará registrada de forma auditable.
            </Text>

            <View
              style={{
                backgroundColor: colors.surfaceHigh,
                borderRadius: radii.lg,
                padding: spacing.md,
                borderWidth: 1,
                borderColor: colors.border,
                gap: spacing.sm,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>Formato de archivo:</Text>
                <Text style={{ color: colors.volt, fontSize: fontSizes.xs, fontWeight: '700' }}>
                  {format.toUpperCase()}
                </Text>
              </View>
              <View style={{ height: 1, backgroundColor: colors.border }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>Rutinas seleccionadas:</Text>
                <Text style={{ color: colors.text, fontSize: fontSizes.xs, fontWeight: semibold }}>
                  {routineId === 'ALL'
                    ? 'Todas las rutinas'
                    : routines.find((r) => r.id === routineId)?.nombre ?? 'Rutina específica'}
                </Text>
              </View>
              <View style={{ height: 1, backgroundColor: colors.border }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>Período temporal:</Text>
                <Text style={{ color: colors.text, fontSize: fontSizes.xs, fontWeight: semibold }}>
                  {datePreset === 'ALL'
                    ? 'Todo el historial'
                    : datePreset === 'LAST_30'
                      ? 'Últimos 30 días'
                      : datePreset === 'LAST_90'
                        ? 'Últimos 90 días'
                        : 'Último año'}
                </Text>
              </View>
              <View style={{ height: 1, backgroundColor: colors.border }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>Campos incluidos:</Text>
                <Text style={{ color: colors.text, fontSize: fontSizes.xs, fontWeight: semibold }}>
                  Todos los campos del sistema de rutinas
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* BOTONERA INFERIOR DE NAVEGACIÓN */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginTop: spacing.sm,
          }}
        >
          {step > 1 && (
            <Button
              disabled={downloading}
              icon="arrow-back"
              label="Atrás"
              onPress={() => setStep((s) => (s - 1) as WizardStep)}
              style={{ flex: 1 }}
              variant="secondary"
            />
          )}

          {step < 5 && (
            <Button
              disabled={downloading}
              label="Saltar"
              onPress={handleSkipCurrentStep}
              style={{ flex: 1 }}
              variant="ghost"
            />
          )}

          {step < 5 ? (
            <Button
              icon="arrow-forward"
              label="Siguiente"
              onPress={() => setStep((s) => (s + 1) as WizardStep)}
              style={{ flex: 1 }}
              variant="primary"
            />
          ) : (
            <Button
              disabled={downloading}
              icon={downloading ? undefined : 'download-outline'}
              label={downloading ? 'Generando archivo...' : 'Descargar progreso'}
              loading={downloading}
              onPress={() => void executeDownload()}
              style={{ flex: 2 }}
              variant="primary"
            />
          )}
        </View>
      </View>
    </BottomSheet>
  );
}
