# Estrategia de seeds

En el backend:

```bash
yarn db:seed:base
yarn db:seed:mock
yarn db:seed:all:development
```

El seed base crea/actualiza el administrador configurado por `SEED_ADMIN_*`. El mock
crea coach, atleta activo y atleta inactivo con `SEED_MOCK_PASSWORD`; rechaza producción.
El correo es clave natural y la repetición actualiza campos gestionados sin duplicar.
No se ejecutaron contra PostgreSQL por indisponibilidad de Docker.
