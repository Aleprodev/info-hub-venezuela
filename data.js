/**
 * data.js — Venezuela InfoSismo · Datos de emergencia
 * Se carga como <script> para funcionar con file:// y sin servidor.
 * Para actualizar datos: edita este archivo o el data.json y copia aquí.
 */
window.VZ_DATA = {
  "version": "1.7.1",
  "ultimaActualizacion": "2026-06-27",
  "zonasAfectadas": ["Distrito Capital", "La Guaira", "Carabobo", "Miranda", "Aragua", "Yaracuy"],
  "contactos": [
    {
      "id": "emergencias-911",
      "nombre": "Línea de Emergencias 911",
      "tipo": "emergencia",
      "estado": "nacional",
      "telefono": "911",
      "descripcion": "Emergencias nacionales — policía, bomberos, ambulancia",
      "verificado": true,
      "esLlamadaPrincipal": true
    },
    {
      "id": "pc-nacional",
      "nombre": "Protección Civil Nacional",
      "tipo": "emergencia",
      "estado": "nacional",
      "telefono": "0800-7248451",
      "descripcion": "Coordinación nacional de emergencias y desastres",
      "verificado": true
    },
    {
      "id": "pc-dc",
      "nombre": "Protección Civil — Distrito Capital",
      "tipo": "emergencia",
      "estado": "Distrito Capital",
      "telefono": "0212-5753332",
      "descripcion": "Protección Civil Caracas y Distrito Capital",
      "verificado": true
    },
    {
      "id": "pc-laguaira",
      "nombre": "Protección Civil — La Guaira",
      "tipo": "emergencia",
      "estado": "La Guaira",
      "telefono": "0424-2075335",
      "descripcion": "Protección Civil Estado La Guaira (zona más afectada)",
      "verificado": true
    },
    {
      "id": "pc-carabobo",
      "nombre": "Protección Civil — Carabobo",
      "tipo": "emergencia",
      "estado": "Carabobo",
      "telefono": "0241-8592171",
      "descripcion": "Protección Civil Estado Carabobo",
      "verificado": true
    },
    {
      "id": "pc-miranda",
      "nombre": "Protección Civil — Miranda",
      "tipo": "emergencia",
      "estado": "Miranda",
      "telefono": "0212-3837849",
      "descripcion": "Protección Civil Estado Miranda",
      "verificado": true
    },
    {
      "id": "pc-aragua",
      "nombre": "Protección Civil — Aragua",
      "tipo": "emergencia",
      "estado": "Aragua",
      "telefono": "0243-2474940",
      "descripcion": "Protección Civil Estado Aragua",
      "verificado": true
    },
    {
      "id": "cruzroja",
      "nombre": "Cruz Roja Venezolana",
      "tipo": "salud",
      "estado": "nacional",
      "telefono": "+58212-5714380",
      "url": "https://cruzroja.org.ve",
      "descripcion": "Asistencia humanitaria y primeros auxilios",
      "verificado": true
    },
    {
      "id": "bomberos-dc",
      "nombre": "Bomberos Metropolitanos Caracas",
      "tipo": "bomberos",
      "estado": "Distrito Capital",
      "telefono": "0212-5454545",
      "descripcion": "Cuerpo de bomberos Caracas",
      "verificado": true
    },
    {
      "id": "cicpc",
      "nombre": "CICPC — Personas Desaparecidas",
      "tipo": "policia",
      "estado": "nacional",
      "telefono": "0800-2462723",
      "descripcion": "Reporte de personas desaparecidas",
      "verificado": true
    }
  ],
  "hospitales": [
    {
      "id": "hosp-cruzroja-ccs",
      "nombre": "Hospital Cruz Roja Venezolana — Caracas",
      "tipo": "hospital",
      "estado": "Distrito Capital",
      "ciudad": "Caracas",
      "direccion": "Av. Vollmer, San Bernardino, Caracas",
      "telefono": "+58212-5514921",
      "emergencias": true,
      "verificado": true,
      "mapsUrl": "https://maps.google.com/?q=Hospital+Cruz+Roja+San+Bernardino+Caracas"
    },
    {
      "id": "hosp-vargas",
      "nombre": "Hospital Vargas de Caracas",
      "tipo": "hospital",
      "estado": "Distrito Capital",
      "ciudad": "Caracas",
      "direccion": "San José, Caracas",
      "telefono": "0212-4080111",
      "emergencias": true,
      "verificado": true,
      "mapsUrl": "https://maps.google.com/?q=Hospital+Vargas+Caracas"
    },
    {
      "id": "hosp-militar-arvelo",
      "nombre": "Hospital Militar Dr. Carlos Arvelo",
      "tipo": "hospital",
      "estado": "Distrito Capital",
      "ciudad": "Caracas",
      "direccion": "Bello Monte, Caracas",
      "telefono": "0212-7531111",
      "emergencias": true,
      "verificado": true,
      "mapsUrl": "https://maps.google.com/?q=Hospital+Militar+Carlos+Arvelo+Caracas"
    },
    {
      "id": "hosp-prince-lara",
      "nombre": "Hospital Adolfo Prince Lara",
      "tipo": "hospital",
      "estado": "Carabobo",
      "ciudad": "Puerto Cabello",
      "direccion": "Puerto Cabello, Carabobo",
      "telefono": "",
      "emergencias": true,
      "verificado": true,
      "mapsUrl": "https://maps.google.com/?q=Hospital+Adolfo+Prince+Lara+Puerto+Cabello"
    }
  ],
  "refugios": [
    {
      "id": "refugio-estadio-laguaira",
      "nombre": "Estadio Jorge Luis García Carneiro",
      "tipo": "oficial",
      "estado": "La Guaira",
      "ubicacion": "Avenida José María España, Parroquia Macuto",
      "activo": true,
      "verificado": true,
      "mapsUrl": "https://maps.app.goo.gl/bYEdVXndJepDZups5"
    },
    {
      "id": "ipostel-san-juan",
      "nombre": "Centro Postal Ipostel",
      "estado": "Distrito Capital",
      "ubicacion": "Avenida San Martín, Caracas - Parroquia San Juan",
      "activo": true,
      "verificado": true,
      "mapsUrl": "https://maps.app.goo.gl/bvjZdqocnisRB5A5A"
    },
    {
      "id": "coliseo-la-urbina",
      "nombre": "Coliseo de La Urbina (Deportivo Petare)",
      "estado": "Miranda",
      "ubicacion": "La Urbina, Municipio Sucre (Gran Caracas)",
      "activo": true,
      "verificado": true,
      "mapsUrl": "https://maps.app.goo.gl/5GzpAMPmddW6E5Bv5"
    },
    {
      "id": "caraballeda-golf-club",
      "nombre": "Caraballeda Golf & Yacht Club",
      "estado": "La Guaira",
      "ubicacion": "Avenida Charama, Urbanización Caribe, Caraballeda",
      "activo": true,
      "verificado": true,
      "mapsUrl": "https://maps.app.goo.gl/mD6KaNFXydmqwWPn6"
    }
  ],
  "centrosAcopio": [
    {
      "id": "acopio-altamira",
      "nombre": "Centro de Acopio Altamira",
      "tipo": "acopio",
      "estado": "Miranda",
      "direccion": "Cuarta avenida de Altamira, entre 9na y 10ma transversal, Qta El Bejucal",
      "descripcion": "Recolección de ayuda humanitaria",
      "verificado": true,
      "mapsUrl": "https://maps.google.com/?q=Cuarta+avenida+Altamira+Caracas"
    },
    {
      "id": "acopio-aragua",
      "nombre": "Centro de Acopio Aragua",
      "tipo": "acopio",
      "estado": "Aragua",
      "direccion": "Av. 19 de abril, C.C. La Capilla, Piso 1, local 21",
      "descripcion": "Recolección de ayuda",
      "verificado": true,
      "mapsUrl": "https://maps.google.com/?q=Centro+Comercial+La+Capilla+Aragua"
    },
    {
      "id": "acopio-carabobo",
      "nombre": "Centro de Acopio El Viñedo",
      "tipo": "acopio",
      "estado": "Carabobo",
      "direccion": "Av. Monseñor Adams, El Viñedo, Edif. Talislandia, Valencia",
      "descripcion": "Recolección de ayuda",
      "verificado": true,
      "mapsUrl": "https://maps.google.com/?q=Avenida+Monse%C3%B1or+Adams+El+Vi%C3%B1edo+Valencia"
    }
  ],
  "donaciones": [
    {
      "id": "gofundme-welove",
      "nombre": "Emergency Relief for Venezuela Earthquake Victims",
      "organizacion": "We Love Foundation (I Love Venezuela Foundation)",
      "descripcion": "Entrega alimentos, agua, refugio y medicinas a familias afectadas. Trabaja con socios verificados como GEM y ONGs locales.",
      "url": "https://www.gofundme.com/f/emergency-relief-for-venezuela-earthquake-victims",
      "plataforma": "GoFundMe",
      "verificado": true
    },
    {
    "id": "yummy-todos-juntos",
    "nombre": "Together for Venezuela",
    "organizacion": "Yummy (en alianza con Kavak, Slashfi, FelixPago y La Wawa)",
    "descripcion": "Plataforma de recaudación especial que aporta un 25% adicional por cada dólar donado. Cuenta con un fondo conjunto de $365.000.",
    "url": "https://dona.yummyrides.com/",
    "plataforma": "Yummy Web",
    "verificado": true
  }
  ],
  "guias": [
    {
      "id": "durante",
      "titulo": "Durante el terremoto",
      "icono": "⚡",
      "urgencia": "alta",
      "pasos": [
        "Agáchate, cúbrete la cabeza con los brazos y sujétate",
        "Busca refugio bajo una mesa resistente o junto a una pared interior",
        "Aléjate de ventanas, espejos, estantes y lámparas",
        "Si estás en cama, quédate ahí y protege la cabeza con la almohada",
        "No corras hacia las escaleras ni al exterior durante el temblor",
        "Si estás en la calle, aléjate de edificios, postes y cables eléctricos",
        "Si estás en auto, detente lejos de puentes y estructuras elevadas"
      ]
    },
    {
      "id": "despues",
      "titulo": "Después del terremoto",
      "icono": "✅",
      "urgencia": "alta",
      "pasos": [
        "Revisa si hay heridos a tu alrededor — atiende primero a los más graves",
        "Cierra las llaves de gas y apaga el tablero eléctrico si hay daños visibles",
        "No enciendas fósforos ni cigarrillos — puede haber fuga de gas",
        "Evacúa el edificio por las escaleras, nunca por el ascensor",
        "Aléjate de estructuras dañadas — pueden colapsar con réplicas",
        "Mantente informado por radio o apps de emergencia",
        "Espera réplicas — son normales y pueden durar días o semanas"
      ]
    },
    {
      "id": "evacuacion",
      "titulo": "Evacuación segura",
      "icono": "🚪",
      "urgencia": "alta",
      "pasos": [
        "Usa siempre las escaleras, nunca el ascensor",
        "Lleva contigo documentos de identidad si puedes hacerlo rápido",
        "Coge el kit de emergencia si está a mano",
        "Dirígete al punto de encuentro familiar acordado previamente",
        "No vuelvas al edificio hasta que las autoridades lo autoricen",
        "Ayuda a personas mayores, niños y con movilidad reducida",
        "Reporta a Protección Civil si hay personas atrapadas: 911"
      ]
    },
    {
      "id": "kit",
      "titulo": "Kit de emergencia básico",
      "icono": "🎒",
      "urgencia": "media",
      "pasos": [
        "Agua: mínimo 3 litros por persona por día (para 3 días)",
        "Alimentos no perecederos para 3 días (enlatados, galletas, frutas secas)",
        "Linterna con pilas extra o de carga solar",
        "Radio de pilas o manivela para información sin internet",
        "Botiquín básico: vendas, antiséptico, analgésicos, medicamentos personales",
        "Copia de documentos importantes en bolsa impermeable",
        "Dinero en efectivo (los cajeros pueden fallar)",
        "Cargador de batería externo para el celular",
        "Ropa extra, zapatos resistentes, impermeable"
      ]
    },
    {
      "id": "replicas",
      "titulo": "Cómo manejar las réplicas",
      "icono": "🔄",
      "urgencia": "media",
      "pasos": [
        "Las réplicas son normales después de un sismo fuerte",
        "Ante cada réplica: agáchate, cúbrete y sujétate",
        "Mantente alejado de estructuras dañadas durante días",
        "Si estás en refugio temporal, aléjate de columnas y techos dañados",
        "Reporta daños nuevos en estructuras al 911"
      ]
    },
    {
      "id": "comunicacion",
      "titulo": "Comunicación en emergencia",
      "icono": "📡",
      "urgencia": "media",
      "pasos": [
        "Envía mensajes de texto en vez de llamadas — viajan mejor con redes saturadas",
        "Usa WhatsApp o Telegram cuando haya datos",
        "Establece UN contacto fuera de la ciudad como punto de referencia familiar",
        "Carga el celular siempre que puedas aunque sea un poco",
        "En modo offline: esta app funciona sin internet con datos guardados",
        "Radio AM/FM funciona sin internet — es tu mejor fuente en corte total"
      ]
    }
  ],
  "enlacesDesaparecidos": [
    {
      "id": "desaparecidos-terremoto",
      "nombre": "Desaparecidos Terremoto Venezuela",
      "url": "https://desaparecidosterremotovenezuela.com",
      "descripcion": "Base de datos colaborativa de personas reportadas como desaparecidas",
      "tipo": "plataforma_ciudadana",
      "verificado": false
    },
    {
      "id": "vtebusca",
      "nombre": "Venezuela Te Busca",
      "url": "https://venezuelatebusca.com",
      "descripcion": "Plataforma para reportar y buscar personas desaparecidas en el terremoto",
      "tipo": "plataforma_ciudadana",
      "verificado": false
    },
  ],
  "apoyoPsicologico": [
    {
      "id": "lineas_comunitarias_ccs",
      "title": "Líneas Comunitarias de Orientación Psicológica",
      "provider": "Redes Profesionales Académicas (Caracas)",
      "category": "Atención Telefónica y Virtual",
      "description": "Canales telefónicos gratuitos para asistir a los ciudadanos en el manejo de la agitación, ansiedad y organización de prioridades emocionales.",
      "has_link": false,
      "action_url": "",
      "has_phone": true,
      "phone_numbers": ["+584141217882", "+584241723981"],
      "display_phone": "0414-121.78.82 / 0424-172.39.81",
      "badge_text": "Llamada Gratuita"
    },
    {
      "id": "casa_venezuela_wa",
      "title": "Red Casa Venezuela",
      "provider": "Acompañamiento Psicoterapéutico",
      "category": "Atención Telefónica y Virtual",
      "description": "Servicio de apoyo y acompañamiento psicoterapéutico de emergencia diseñado para brindar contención inmediata a través de mensajería.",
      "has_link": true,
      "action_url": "https://wa.link/ekc3mi",
      "has_phone": false,
      "phone_numbers": [],
      "display_phone": "",
      "badge_text": "WhatsApp"
    },
    {
      "id": "psicoven_form",
      "title": "Soporte de Trauma PSICOVEN",
      "provider": "Psicólogos Venezolanos Aliados",
      "category": "Atención Telefónica y Virtual",
      "description": "Espacio digital coordinado para mitigar el impacto del trauma y brindar sesiones breves de terapia psicológica a los afectados.",
      "has_link": true,
      "action_url": "https://forms.gle/WNUk97gLKr7aW9of7",
      "has_phone": false,
      "phone_numbers": [],
      "display_phone": "",
      "badge_text": "Formulario Web"
    },
    {
      "id": "aasm_argentina",
      "title": "Asociación Argentina de Salud Mental (AASM)",
      "provider": "Red de Apoyo a la Diáspora",
      "category": "Atención Telefónica y Virtual",
      "description": "Espacio de escucha gratuito y confidencial dirigido a mitigar el estrés y la angustia de venezolanos en Argentina con familiares en la zona de desastre.",
      "has_link": true,
      "action_url": "https://forms.gle/CsnfjLmxwfN5GWo16",
      "has_phone": false,
      "phone_numbers": [],
      "display_phone": "",
      "badge_text": "Apoyo Exterior"
    },
    {
      "id": "hospital_vargas",
      "title": "Servicio de Salud Mental",
      "provider": "Hospital Vargas de Caracas",
      "category": "Atención Institucional y Presencial",
      "description": "Programa de asistencia gratuita presencial para atender secuelas emocionales y reacciones agudas post-sismo. Difunden pautas de autocuidado en redes.",
      "has_link": true,
      "action_url": "https://www.instagram.com/psicologiahospitalvargas",
      "has_phone": false,
      "phone_numbers": [],
      "display_phone": "",
      "badge_text": "Presencial / Redes"
    },
    {
      "id": "cruz_roja_ve",
      "title": "Salud Mental y Apoyo Psicosocial (SMAPS)",
      "provider": "Cruz Roja Venezolana",
      "category": "Atención Institucional y Presencial",
      "description": "Despliegue de equipos en el terreno para la estabilización en crisis y soporte en el Restablecimiento del Contacto entre Familiares (RCF).",
      "has_link": false,
      "action_url": "",
      "has_phone": true,
      "phone_numbers": ["+584227994880"],
      "display_phone": "0422-799.48.80",
      "badge_text": "Equipos en Terreno"
    }
  ],
  "necesidadesDonacion": {
    "fecha": "27 de junio 2026",
    "prioridadAlta": [
      { "icono": "💧", "nombre": "Agua potable embotellada", "descripcion": "Agua sellada, botellones o bidones para consumo y limpieza básica" },
      { "icono": "🍝", "nombre": "Alimentos no perecederos", "descripcion": "Arroz, pasta, atún en lata, sardinas, lentejas, frijoles, galletas, leche en polvo" },
      { "icono": "💊", "nombre": "Medicamentos", "descripcion": "Ibuprofeno, Paracetamol / Acetaminofén, Amoxicilina + Ác. clavulánico, Ceftriaxona, Diclofenaco, Omeprazol, Suero oral (sales de rehidratación)", "fullWidth": true },
      { "icono": "🏥", "nombre": "Insumos médicos", "descripcion": "Gasas estériles, vendas, guantes, alcohol isopropílico, micropore, jeringas, suturas", "fullWidth": true }
    ],
    "secundario": [
      { "icono": "🧴", "nombre": "Productos de higiene", "descripcion": "Jabón, pasta dental, cepillos, toallas sanitarias, pañales (bebé y adulto), papel higiénico" },
      { "icono": "🛏️", "nombre": "Cobijas, frazadas y sábanas", "descripcion": "Preferiblemente nuevas o en excelente estado" },
      { "icono": "👕", "nombre": "Ropa en buen estado", "descripcion": "Limpia y nueva o en muy buen estado. Ropa interior nueva" },
      { "icono": "🧹", "nombre": "Artículos de limpieza", "descripcion": "Cloro, detergente, desinfectante, bolsas de basura" },
      { "icono": "🍼", "nombre": "Leche en polvo y cereales para niños", "descripcion": "Fórmulas infantiles, compotas, papillas" }
    ]
  },
  "iniciativas_apoyo": [
    {
      "id": "binance-airdrop-relief",
      "nombre": "Fondo de Emergencia y Exención de Tarifas",
      "organizacion": "Binance Charity",
      "tipo_ayuda": "Liquidez directa y alivio operativo",
      "descripcion": "Asignación de $3 millones en vouchers de 20 USDT a usuarios de zonas afectadas con Proof of Address (POA). Adicionalmente, suspende comisiones en su plataforma P2P (VES) y pasarela Binance Pay hasta el 2 de julio de 2026.",
      "url": "https://www.binance.com/es/blog/charity/494861573422684842",
      "plataforma": "Binance App / Rewards Hub",
      "estado": "Activo"
    },
    {
      "id": "kontigo-cero-comisiones",
      "nombre": "Remesas Gratuitas de Emergencia",
      "organizacion": "Kontigo App",
      "tipo_ayuda": "Exención de comisiones financieras",
      "descripcion": "Eliminación total de comisiones a nivel nacional para movilizar capital y enviar remesas de apoyo desde el exterior. La empresa absorbe los costos de pasarelas aliadas (Pago Móvil, Binance, PayPal, tarjetas y cripto) y habilitó soporte técnico 24/7.",
      "url": "https://www.instagram.com/p/DZ_gwHNkV-v/",
      "plataforma": "Kontigo App",
      "estado": "Activo"
    },
    {
      "id": "yummy-rides-hospitales",
      "nombre": "Traslados Gratuitos a Centros de Salud",
      "organizacion": "Yummy Rides (en colaboración con Ridery)",
      "tipo_ayuda": "Logística y transporte de emergencia",
      "descripcion": "Financiamiento del 100% de los viajes con origen o destino a hospitales y clínicas en Caracas. No requiere códigos promocionales y los conductores reciben la totalidad de su ganancia al eliminarse la comisión de la app por la contingencia.",
      "url": "https://diarioversionfinal.com/ciudad/yummy-anuncia-viajes-gratuitos-hacia-hospitales-y-clinicas-tras-emergencia-sismica-en-venezuela/#google_vignette",
      "plataforma": "Yummy / Ridery Apps",
      "estado": "Activo"
    }
  ]
};
