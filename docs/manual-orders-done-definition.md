# Definición de terminado

Código, migraciones, RLS, APIs, UI, pruebas y documentación deben estar en el mismo PR. El commit final debe compilar y desplegarse en preview. Las migraciones deben funcionar desde una base limpia. Después de fusionar, producción debe estar READY, health correcto y sin errores de runtime.

Sin esa evidencia, el estado es implementado o validado, no desplegado.
