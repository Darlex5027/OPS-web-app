i# OPS Web App - Aplicación Dockerizada con Base de Datos
Este proyecto es una aplicación web completamente contenerizada usando Docker, con MariaDB como base de datos backend. Proporciona un entorno consistente y aislado tanto para desarrollo como para despliegue.
---
## 📋 Requisitos Previos
- Docker instalado y funcionando en tu sistema
- ara Windows: Instala Docker Desktop (recomendado desde la Microsoft Store o desde [docker.com](https://docker.com))
---
## 🚀 Primeros Pasos
### 1. Clonar el Repositorio
Descarga el archivo ZIP desde la rama `main`, o clónalo usando Git:
```bash
git clone git@github.com:Darlex5027/OPS-web-app.git
cd OPS-web-app
```
### 2. Configuración del Entorno
**Para desarrollo local (testeo):** El archivo `.env` ya está incluido en el repositorio con una contraseña por defecto (`12345678`). No necesitas modificarlo.

**Para despliegue en producción:** Crea un archivo `.env` a partir de `.env.example` y cambia la contraseña:
``` bash
DB_ROOT_PASS=tu_contraseña_segura_aqui
```
---

---
## 📦 Configuración de Docker
La aplicación consta de:
- Contenedor de la aplicación web
- Contenedor de la base de datos MariaDB
Asegúrate de que Docker esté funcionando antes de iniciar la aplicación:
-**Levantar los contenedores (si es primera vez o no hubo cambios estructurales)**
```bash
docker compose up -d
```
**Si hubo cambios en la base de datos o en Dockerfile, reconstruir:**
```bash
docker compose down -v
docker compose build --no-cache
docker compose up -d
```
La aplicación estará disponible en: **http://localhost:8080**
---
## 🔧 Flujo de Trabajo de Desarrollo
### Protección de Ramas
La rama `main` está protegida. No se permiten commits directos. Todos los cambios deben hacerse mediante Pull Requests.
### Cómo Contribuir
#### Opción A — Usando la Interfaz Web de GitHub
1. Ve a https://github.com/Darlex5027/OPS-web-app/branches y haz clic en **New branch**
2. Asígnale un nombre descriptivo: `feature/nombre-de-tu-funcionalidad` y asegúrate de seleccionar `main` como origen
3. Accede a tu rama en: `https://github.com/Darlex5027/OPS-web-app/tree/nombre_de_tu_rama`
4. Usa **Add file → Upload files** para subir tus cambios
5. Arrastra o selecciona tus archivos
6. Escribe un título para el commit y una breve explicación de tus cambios
7. Asegúrate de que **"Commit directly to `nombre_de_tu_rama`"** esté seleccionado y haz clic en **Commit changes**
8. Puedes seguir agregando commits antes de abrir un Pull Request
9. Cuando estés listo, ve a la pestaña **Pull requests** → **New pull request**
10. Asegúrate de que **base** sea `main` y **compare** sea `nombre_de_tu_rama`
11. Haz clic en **Create a pull request**
12. Ponle un título y una descripción de tus cambios
13. Haz clic en **Create a pull request**
14. Tus cambios serán revisados por al menos un miembro del equipo y fusionados por el administrador
#### Opción B — Usando Git (Línea de Comandos)
1. Crea una nueva rama para tus cambios:
```bash
git checkout -b feature/nombre-de-tu-funcionalidad
```
2. Realiza tus cambios o aportaciones.
3. Haz commit de tus cambios en esta rama:
```bash
git add .
git commit -m "Descripción de tus cambios"
git push origin feature/nombre-de-tu-funcionalidad
```
4. Abre un Pull Request en GitHub desde tu rama hacia `main`
---
## 👥 Proceso de Revisión
- Todos los pull requests requieren revisión de al menos 1 colaborador
- La fusión final en `main` debe ser realizada por el administrador del repositorio: **Darlex5027 (Alex)**
---
## 👥 Equipo
- **Administrador:** Darlex5027 (Alex)
Para cualquier pregunta o problema, por favor contacta al administrador del repositorio.
