# AGENTS.md

# Relic

## Objetivo

Relic es un fork de Heroic Game Launcher orientado exclusivamente a Linux.

Su propósito es permitir iniciar sesión en Epic Games, GOG y Amazon Games, descargar e instalar juegos y añadirlos automáticamente a Steam.

Relic NO es un launcher.

Steam es el launcher.

Toda la experiencia de juego ocurre dentro de Steam.

---

# Filosofía

Relic debe ser significativamente más simple que Heroic.

Todo el código debe orientarse a cuatro tareas:

- Autenticación en tiendas.
- Descarga de juegos.
- Instalación y actualización.
- Integración con Steam mediante un script externo.

Cualquier funcionalidad que no contribuya directamente a estas tareas debe eliminarse o rechazarse.

Siempre preferir eliminar código antes que añadir complejidad.

---

# Alcance

Relic debe permitir:

- Login en Epic Games.
- Login en GOG.
- Login en Amazon Games.
- Mostrar biblioteca.
- Descargar juegos.
- Actualizar juegos.
- Reparar instalaciones.
- Desinstalar juegos.
- Detectar ejecutables.
- Ejecutar un script externo tras la instalación.
- Abrir la carpeta del juego.
- Abrir Steam.

Relic NO debe lanzar juegos.

---

# Flujo de instalación

Instalar juego

↓

Descargar

↓

Instalar

↓

Detectar ejecutable principal

↓

Ejecutar script externo

↓

El script añade el juego a Steam

↓

Mostrar éxito

Fin.

Relic nunca ejecuta el juego.

---

# Integración con Steam

Toda la integración con Steam debe realizarse mediante un script externo.

Relic únicamente proporciona al script la información necesaria.

Por ejemplo:

- ruta del juego
- ejecutable
- nombre del juego
- identificador
- plataforma

Relic nunca modifica directamente la configuración interna de Steam.

---

# Gestión de Proton y prefijos

Relic NO administra:

- Proton
- Wine
- Wine-GE
- Proton-GE
- Prefixes
- Compatibilidad
- Variables de entorno

Sin embargo, el script externo puede:

- añadir el juego a Steam
- ejecutar umu-launcher
- crear el esqueleto inicial del prefijo
- copiar archivos a drive_c
- realizar configuraciones necesarias
- devolver un código de éxito o error

Toda esa lógica pertenece exclusivamente al script.

Nunca implementar esa lógica dentro de Relic.

---

# Funcionalidades que NO deben existir

No implementar ni mantener soporte para:

- Wine Manager
- Proton Manager
- Proton GE Manager
- Lutris
- Bottles
- CrossOver
- Winetricks
- DXVK
- VKD3D
- Gamescope
- MangoHud
- Esync
- Fsync
- Variables de entorno
- Configuración avanzada por juego
- Opciones de lanzamiento
- Gestión de prefijos
- Ejecución directa de juegos
- Instalación automática de componentes de Wine

Si alguna parte heredada de Heroic depende de estas funciones, debe simplificarse o eliminarse.

---

# Interfaz

La interfaz debe ser minimalista.

Solo mostrar las funciones necesarias.

Ejemplo:

Biblioteca

Instalar

Actualizar

Desinstalar

Añadir a Steam

Abrir carpeta

Abrir Steam

Eliminar cualquier opción relacionada con Wine o Proton.

Reducir al mínimo el número de pantallas.

---

# Arquitectura

Relic debe actuar únicamente como orquestador.

Responsabilidades:

Relic

- autenticación
- biblioteca
- descargas
- instalaciones
- actualizaciones
- detección del ejecutable
- llamada al script

Script externo

- integración con Steam
- creación del prefijo mediante umu-launcher
- copia de archivos
- configuración específica
- códigos de error

Steam

- ejecución
- Proton
- Steam Input
- Overlay
- Compatibilidad
- Shader Cache

---

# Código

Prioridades:

1. Simplicidad
2. Legibilidad
3. Modularidad
4. Poco mantenimiento

Eliminar código muerto.

Eliminar dependencias innecesarias.

Evitar nuevas dependencias.

Mantener módulos pequeños.

No duplicar lógica.

No implementar funciones "por si acaso".

---

# Fork

Relic nace como un fork de Heroic.

El objetivo a medio plazo es desacoplar el código y reducir progresivamente la dependencia del proyecto original.

Siempre que sea posible:

- eliminar módulos completos
- simplificar arquitectura
- reducir acoplamiento

---

# Principios de desarrollo

Cada nueva funcionalidad debe responder afirmativamente a esta pregunta:

"¿Ayuda a descargar, instalar o añadir juegos a Steam?"

Si la respuesta es NO, probablemente no pertenece a Relic.

Mantener siempre la filosofía:

Menos código.
Menos opciones.
Menos mantenimiento.
Más estabilidad.

---

# Historial

Quiero que en fichero HISTORY_REMOVE.md se vaya guardando todas las tareas que se han ido haciendo y lo más importante: quitando.

Que sea breve, no extenso.

# Objetivo final

Relic debe sentirse como un instalador de juegos para Steam.

El usuario instala un juego desde Epic, GOG o Amazon.

Relic lo descarga.

Relic ejecuta el script.

El juego aparece en Steam.

A partir de ese momento toda la experiencia pertenece a Steam.

Ese es el flujo completo del proyecto.
