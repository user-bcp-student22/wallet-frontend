# HU-1: Alta de cuenta usando la sesión de Google

**Estado:** Borrador para revisión; no aprobado para implementación.

## Fuente y trazabilidad

- **Feature:** [Registro y activación del MVP de wallet](../epics/FEATURES-1.md).
- **Épica:** MVP de wallet en Perú.
- **Parte relacionada:** onboarding guiado y activación solo después de completar los pasos requeridos.

## Historia de usuario

Como persona que inicia el onboarding de la wallet, quiero usar mi sesión de Google para registrar mi cuenta, para comenzar el proceso sin crear credenciales adicionales.

## Contexto y resultado esperado

La autenticación con Google permite iniciar el alta. Completar esta historia no debe activar por sí solo la wallet si aún faltan otros pasos obligatorios del onboarding.

## Alcance

### Incluye

- Ofrecer el inicio de alta mediante una cuenta de Google.
- Continuar el onboarding cuando la identidad se valida correctamente.
- Informar al usuario si cancela el proceso o si la autenticación no puede completarse.

### No incluye

- Definir el mecanismo o protocolo de integración con Google.
- Activar la wallet antes de completar los demás pasos requeridos.
- Definir reglas de vinculación o recuperación de cuentas existentes; quedan pendientes de Producto y Seguridad.

## Criterios de aceptación

1. **Inicio de alta:** Dado que una persona está en el onboarding, cuando elige registrarse con Google, entonces puede iniciar el proceso de autenticación con ese proveedor.
2. **Autenticación exitosa:** Dado que Google devuelve una identidad validada y el alta puede continuar según las reglas aprobadas, cuando el sistema procesa el resultado, entonces se crea o asocia la cuenta conforme a esas reglas y se permite continuar el onboarding.
3. **Onboarding pendiente:** Dado que la cuenta se creó pero quedan pasos obligatorios, entonces la wallet no se considera activa.
4. **Cancelación o error:** Dado que la persona cancela o la autenticación falla, entonces no se presenta el alta como exitosa y se informa cómo volver a intentarlo.
5. **Analítica:** Cuando se inicia o completa este paso, el flujo registra los eventos acordados para el MVP sin incluir credenciales ni tokens de autenticación.

## Comportamiento y contratos a preservar

- La identidad autenticada debe corresponder a la cuenta que continúa el onboarding.
- La wallet solo pasa a activa cuando se completan todos los pasos requeridos, conforme a la feature fuente.
- Los nombres, atributos y destino de los eventos analíticos quedan sujetos a un contrato aprobado antes de la spec.

## Dependencias y riesgos

- Depende de la definición aprobada de autenticación, tratamiento de datos y reglas de identidad.
- Una regla ambigua para cuentas existentes puede crear cuentas duplicadas o bloquear a usuarios legítimos.
- No registrar credenciales, tokens ni otros secretos en eventos o reportes.

## Preguntas abiertas para la spec

- ¿Qué datos de Google se solicitan y cuál es la base aprobada para su uso?
- ¿Qué debe ocurrir si el correo o la identidad de Google ya está asociado a una cuenta?
- ¿Qué estados y mensajes se muestran ante cancelación, rechazo o indisponibilidad del proveedor?
- ¿Qué evento de inicio/completitud se necesita y qué atributos están permitidos?

## Validación y evidencia para la spec

- Aprobación de Producto y Seguridad de los datos solicitados y las reglas de asociación de identidad.
- Casos de prueba para autenticación exitosa, cancelación, error y cuenta existente, una vez definidas sus reglas.
- Contrato de eventos y mensajes de usuario acordados.