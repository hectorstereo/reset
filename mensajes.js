/*
  RESET · Mensajes
  ------------------------------------------------------------------
  Este es el único archivo que necesitas editar para cambiar textos.

  Cada tema tiene:
    pregunta  → la única pregunta (se responde Sí / No)
    tarjetas  → pares [frase principal, frase secundaria]

  Regla de RESET: no negar que exista un problema.
  Distinguir PROBLEMA REAL + ACCIÓN POSIBLE de RUMIACIÓN + URGENCIA.
    Sí → ACTÚA   ·   No → SUELTA

  La app elige una tarjeta al azar y evita repetir las dos últimas
  que viste en ese tema. El historial vive solo en tu iPhone.

  Reglas de estilo: sobrio, adulto, breve. Nada de "¡tú puedes!".
*/

const PREGUNTA = "¿Hay algo que requiera tu atención ahora?";

const MENSAJES = {

  trabajo: {
    pregunta: PREGUNTA,
    tarjetas: [
      ["Ambición alta. Importancia baja.", "¿Esto cambia realmente tu trayectoria hoy?"],
      ["Tu trabajo es una puerta. No es tu destino.", "Hay más de un camino hacia donde vas."],
      ["Hecho, no historia.", "Hecho: no hubo promoción. «Voy atrasado» es historia."],
      ["Estoy construyendo desde una buena posición.", "No estás escapando de nada."],
      ["No tienes que resolver tu vida hoy.", "No necesitas controlar todo el camino."],
    ],
  },

  dinero: {
    pregunta: PREGUNTA,
    tarjetas: [
      ["Ambición alta. Importancia baja.", "El patrimonio se construye en años, no esta tarde."],
      ["Estoy construyendo desde una buena posición.", "El interés compuesto no necesita que lo vigiles."],
      ["Querer más no significa despreciar lo que ya tengo.", "Ambición alta. Importancia baja."],
      ["No tienes que resolver tu vida hoy.", "Las buenas decisiones financieras no se toman con urgencia."],
    ],
  },

  otra: {
    pregunta: PREGUNTA,
    tarjetas: [
      ["Hecho, no historia.", "¿Qué ocurrió, sin interpretación?"],
      ["Hecho, no historia.", "«Todo me sale mal» es historia. ¿Cuál es el hecho?"],
      ["Sentir urgencia no significa que todo sea urgente.", "¿Qué requiere realmente tu atención ahora?"],
      ["No tienes que resolver tu vida hoy.", "Una cosa a la vez."],
    ],
  },

};
