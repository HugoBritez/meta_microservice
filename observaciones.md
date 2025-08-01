# Requisitos para integrar la API de WhatsApp Business en un CRM

Para que una empresa pueda utilizar oficialmente la **API de WhatsApp Business (WABA)** e integrarla con su sistema CRM, es necesario cumplir con los siguientes requisitos exigidos por **Meta (Facebook)**:

---

## 1. Cuenta de Business Manager en Meta

La empresa debe tener una cuenta activa en [Meta Business Manager](https://business.facebook.com/) vinculada a un perfil personal de Facebook.  
Esta cuenta debe ser **administrada por un representante autorizado de la empresa**.

---

## 2. Verificación del negocio

La cuenta de Business Manager debe pasar el proceso de **verificación de empresa**. Esto incluye:

- Subir documentación legal (por ejemplo: RUC, estatutos, factura de servicios).
- Confirmar la dirección comercial y el número de teléfono corporativo.
- Aceptar los términos de uso de WhatsApp Business API.

> ⚠️ La verificación puede tardar algunos días y es condición obligatoria para usar la API.

---

## 3. Fanpage de Facebook activa

Meta requiere que la empresa tenga una **página comercial activa en Facebook**, aunque no se utilice para campañas o publicaciones.  
Esta fanpage debe estar vinculada a la cuenta de Business Manager.

---

## 4. Número de teléfono exclusivo para la API

Se debe contar con un número de teléfono **dedicado exclusivamente** para su uso con WhatsApp Business API.  
Este número:

- **No puede estar vinculado a la app estándar de WhatsApp ni a WhatsApp Business App.**
- Puede ser un número fijo o móvil, siempre que pueda recibir un código de verificación por SMS o llamada.
- Una vez vinculado a la API, **no podrá usarse nuevamente desde un dispositivo móvil** con la app tradicional.

---

## 5. Cuenta de WhatsApp Business (WABA)

Dentro del Business Manager, se debe crear una cuenta específica para **WhatsApp Business**.  
Allí se gestionan:

- Los números registrados.
- Las plantillas de mensajes (que deben ser aprobadas por Meta).
- La configuración general de la integración con otros sistemas (como el CRM).

---

## ❓¿Puedo usar el mismo número en la app y en el CRM?

**No. Meta no permite usar el mismo número en la aplicación móvil (WhatsApp o WhatsApp Business) y en la API al mismo tiempo.**

Si una empresa ya usa un número con la app en el celular, no podrá conectarlo a la API hasta que lo **desvincule completamente** y lo migre a la cuenta WABA.

---

### ✅ Alternativas recomendadas

#### Opción 1: Usar dos números (recomendado)

- **Número actual** → sigue usándose con la app en el celular.
- **Nuevo número** → se registra en la API para uso exclusivo del CRM.

Permite mantener ambas funciones sin interrupciones.

---

#### Opción 2: Migrar el número actual a la API

- Se elimina el número de la app.
- Se registra en la API.
- Solo se accede desde el CRM (no más acceso desde la app de whatsapp, solo desde el sistema en version mobil).

Ideal si se quiere centralizar todo el canal en una única plataforma profesional.

---

#### Opción 3: Usar soluciones no oficiales (no recomendado)

Existen herramientas que simulan la API utilizando WhatsApp Web (como *Venom*, *Chat-API*, *WPPConnect*), pero:

- **No están autorizadas por Meta.**
- **Pueden causar bloqueos del número.**
- **No son estables ni seguras para producción.**

> ⚠️ No se recomienda su uso para entornos empresariales serios.

---

## ✅ Observación importante

Estos requisitos **no son opcionales** ni reemplazables.  
Son parte del proceso oficial de Meta para garantizar un uso legítimo, transparente y profesional del canal de WhatsApp en entornos empresariales.
