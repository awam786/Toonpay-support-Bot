// ============ TOONPAY i18n — 20 languages ============
// Order matters — this drives the language-selection keyboard.
// English (1), Spanish (2), German (3), Hungarian (4), Turkish (5), Russian (6),
// then the remaining top languages.

const LANGUAGES = {
  en: {
    name: 'English', flag: '🇬🇧',
    choose_lang: '🌐 Please select your language:',
    lang_set: '✅ Language set to English.',
    guide:
`👋 *Welcome to ToonPay Support!*

📝 *How to create a ticket*
• Tap "Create Ticket Now" below, or send /newticket
• Choose a category, then describe your issue
• You'll get a ticket ID like #1042

📊 *Check ticket status*
/status <id> — check a specific ticket
/mytickets — list all your tickets

💬 *Reply to your ticket*
Just type a message — it's added to your open ticket automatically
Or use /reply <id> <text>

🌐 *Language* — /language
📖 *Guide* — /guide
❌ *Cancel* — /cancel

We reply 24/7. 🚀`,
    btn_create: '➕ Create Ticket Now',
    btn_mytickets: '📋 My Tickets',
    btn_guide: '📖 Help',
    btn_change_lang: '🌐 Change Language',
    newticket_choose_cat: '📂 Choose a category for your ticket:',
    cat_payment: '💳 Payment / Deposit',
    cat_withdrawal: '💸 Withdrawal',
    cat_kyc: '🆔 KYC Verification',
    cat_card: '💳 Card Issue',
    cat_account: '🔐 Account Access',
    cat_other: '❓ Other',
    newticket_describe: '✍️ Please describe your issue in detail.\nInclude any relevant transaction ID, wallet address or error message.',
    ticket_created: '✅ Ticket *#{number}* created!\n\nAn agent will reply shortly.\nUse /status {number} to check its status anytime.',
    no_tickets: '📭 You have no tickets yet.\nUse /newticket to create one.',
    mytickets_header: '📋 *Your tickets:*\n',
    status_usage: 'Usage: /status <ticket_id>\nExample: /status 1042',
    status_not_found: '❌ Ticket not found, or it does not belong to you.',
    status_result: '🎫 *Ticket #{number}*\n\nStatus: {status}\nPriority: {priority}\nCreated: {date}',
    cancelled: '❌ Cancelled.',
    invalid_option: '⚠️ Invalid option. Please try again.',
    msg_added: '✅ Your message was added to ticket #{number}.',
    no_open_ticket: '💡 You don\'t have an open ticket yet. Create one first:',
    reply_usage: 'Usage: /reply <ticket_id> <message>',
    reply_hint: '💬 Reply to this ticket:\n/reply {number} your message',
    statuses: { open: 'Open', in_progress: 'In Progress', pending: 'Pending', resolved: 'Resolved', closed: 'Closed' },
    priorities: { low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent' }
  },

  es: {
    name: 'Español', flag: '🇪🇸',
    choose_lang: '🌐 Por favor seleccione su idioma:',
    lang_set: '✅ Idioma cambiado a Español.',
    guide:
`👋 *¡Bienvenido al Soporte de ToonPay!*

📝 *Cómo crear un ticket*
• Toque "Crear Ticket" o envíe /newticket
• Elija una categoría y describa su problema
• Recibirá un ID como #1042

📊 *Estado del ticket*
/status <id> — consultar un ticket
/mytickets — listar todos sus tickets

💬 *Responder al ticket*
Simplemente escriba — se agrega automáticamente
O use /reply <id> <texto>

🌐 *Idioma* — /language
📖 *Ayuda* — /guide
❌ *Cancelar* — /cancel

Respondemos 24/7. 🚀`,
    btn_create: '➕ Crear Ticket',
    btn_mytickets: '📋 Mis Tickets',
    btn_guide: '📖 Ayuda',
    btn_change_lang: '🌐 Cambiar Idioma',
    newticket_choose_cat: '📂 Elija una categoría para su ticket:',
    cat_payment: '💳 Pago / Depósito',
    cat_withdrawal: '💸 Retiro',
    cat_kyc: '🆔 Verificación KYC',
    cat_card: '💳 Problema con Tarjeta',
    cat_account: '🔐 Acceso a Cuenta',
    cat_other: '❓ Otro',
    newticket_describe: '✍️ Describa su problema en detalle.\nIncluya ID de transacción, dirección de billetera o mensaje de error si aplica.',
    ticket_created: '✅ ¡Ticket *#{number}* creado!\n\nUn agente responderá pronto.\nUse /status {number} para consultar el estado.',
    no_tickets: '📭 No tiene tickets aún.\nUse /newticket para crear uno.',
    mytickets_header: '📋 *Sus tickets:*\n',
    status_usage: 'Uso: /status <id_de_ticket>\nEjemplo: /status 1042',
    status_not_found: '❌ Ticket no encontrado o no le pertenece.',
    status_result: '🎫 *Ticket #{number}*\n\nEstado: {status}\nPrioridad: {priority}\nCreado: {date}',
    cancelled: '❌ Cancelado.',
    invalid_option: '⚠️ Opción inválida. Intente de nuevo.',
    msg_added: '✅ Su mensaje fue añadido al ticket #{number}.',
    no_open_ticket: '💡 No tiene un ticket abierto. Cree uno primero:',
    reply_usage: 'Uso: /reply <id_ticket> <mensaje>',
    reply_hint: '💬 Responde a este ticket:\n/reply {number} tu mensaje',
    statuses: { open: 'Abierto', in_progress: 'En Progreso', pending: 'Pendiente', resolved: 'Resuelto', closed: 'Cerrado' },
    priorities: { low: 'Baja', normal: 'Normal', high: 'Alta', urgent: 'Urgente' }
  },

  de: {
    name: 'Deutsch', flag: '🇩🇪',
    choose_lang: '🌐 Bitte wählen Sie Ihre Sprache:',
    lang_set: '✅ Sprache auf Deutsch geändert.',
    guide:
`👋 *Willkommen beim ToonPay Support!*

📝 *Ticket erstellen*
• Tippen Sie auf "Ticket erstellen" oder senden Sie /newticket
• Wählen Sie eine Kategorie und beschreiben Sie Ihr Problem
• Sie erhalten eine Ticket-ID wie #1042

📊 *Ticket-Status prüfen*
/status <ID> — bestimmtes Ticket prüfen
/mytickets — alle Tickets anzeigen

💬 *Auf Ticket antworten*
Einfach Nachricht eingeben — wird automatisch hinzugefügt
Oder /reply <ID> <Text>

🌐 *Sprache* — /language
📖 *Hilfe* — /guide
❌ *Abbrechen* — /cancel

Wir antworten rund um die Uhr. 🚀`,
    btn_create: '➕ Ticket erstellen',
    btn_mytickets: '📋 Meine Tickets',
    btn_guide: '📖 Hilfe',
    btn_change_lang: '🌐 Sprache ändern',
    newticket_choose_cat: '📂 Wählen Sie eine Kategorie:',
    cat_payment: '💳 Zahlung / Einzahlung',
    cat_withdrawal: '💸 Auszahlung',
    cat_kyc: '🆔 KYC-Verifizierung',
    cat_card: '💳 Kartenproblem',
    cat_account: '🔐 Kontozugriff',
    cat_other: '❓ Sonstiges',
    newticket_describe: '✍️ Bitte beschreiben Sie Ihr Problem im Detail.\nFügen Sie Transaktions-ID, Wallet-Adresse oder Fehlermeldung bei.',
    ticket_created: '✅ Ticket *#{number}* erstellt!\n\nEin Mitarbeiter antwortet in Kürze.\nVerwenden Sie /status {number}, um den Status zu prüfen.',
    no_tickets: '📭 Sie haben noch keine Tickets.\nVerwenden Sie /newticket.',
    mytickets_header: '📋 *Ihre Tickets:*\n',
    status_usage: 'Verwendung: /status <Ticket-ID>\nBeispiel: /status 1042',
    status_not_found: '❌ Ticket nicht gefunden oder gehört nicht Ihnen.',
    status_result: '🎫 *Ticket #{number}*\n\nStatus: {status}\nPriorität: {priority}\nErstellt: {date}',
    cancelled: '❌ Abgebrochen.',
    invalid_option: '⚠️ Ungültige Option. Bitte erneut versuchen.',
    msg_added: '✅ Ihre Nachricht wurde zu Ticket #{number} hinzugefügt.',
    no_open_ticket: '💡 Sie haben kein offenes Ticket. Erstellen Sie zuerst eines:',
    reply_usage: 'Verwendung: /reply <Ticket-ID> <Nachricht>',
    reply_hint: '💬 Auf dieses Ticket antworten:\n/reply {number} Ihre Nachricht',
    statuses: { open: 'Offen', in_progress: 'In Bearbeitung', pending: 'Ausstehend', resolved: 'Gelöst', closed: 'Geschlossen' },
    priorities: { low: 'Niedrig', normal: 'Normal', high: 'Hoch', urgent: 'Dringend' }
  },

  hu: {
    name: 'Magyar', flag: '🇭🇺',
    choose_lang: '🌐 Kérjük, válassza ki a nyelvét:',
    lang_set: '✅ Nyelv beállítva: Magyar.',
    guide:
`👋 *Üdvözöljük a ToonPay Supportnál!*

📝 *Jegy létrehozása*
• Koppintson a "Jegy létrehozása" gombra vagy küldje: /newticket
• Válasszon kategóriát, majd írja le a problémát
• Kap egy jegyszámot, pl. #1042

📊 *Jegy állapotának ellenőrzése*
/status <azonosító> — adott jegy ellenőrzése
/mytickets — összes jegy listázása

💬 *Válasz a jegyre*
Csak írjon üzenetet — automatikusan hozzáadódik
Vagy /reply <azonosító> <szöveg>

🌐 *Nyelv* — /language
📖 *Súgó* — /guide
❌ *Mégse* — /cancel

24/7 válaszolunk. 🚀`,
    btn_create: '➕ Jegy létrehozása',
    btn_mytickets: '📋 Jegyeim',
    btn_guide: '📖 Súgó',
    btn_change_lang: '🌐 Nyelv módosítása',
    newticket_choose_cat: '📂 Válasszon kategóriát:',
    cat_payment: '💳 Fizetés / Befizetés',
    cat_withdrawal: '💸 Kifizetés',
    cat_kyc: '🆔 KYC Ellenőrzés',
    cat_card: '💳 Kártya probléma',
    cat_account: '🔐 Fiókhozzáférés',
    cat_other: '❓ Egyéb',
    newticket_describe: '✍️ Kérjük, részletesen írja le a problémát.\nAdja meg a tranzakció-azonosítót, tárca címét vagy hibaüzenetet.',
    ticket_created: '✅ *#{number}* jegy létrehozva!\n\nEgy munkatárs hamarosan válaszol.\nHasználja a /status {number} parancsot az állapot ellenőrzéséhez.',
    no_tickets: '📭 Még nincs jegye.\nHasználja a /newticket parancsot.',
    mytickets_header: '📋 *Jegyei:*\n',
    status_usage: 'Használat: /status <jegy_azonosító>\nPélda: /status 1042',
    status_not_found: '❌ Jegy nem található, vagy nem az Öné.',
    status_result: '🎫 *#{number}* jegy\n\nÁllapot: {status}\nPrioritás: {priority}\nLétrehozva: {date}',
    cancelled: '❌ Mégse.',
    invalid_option: '⚠️ Érvénytelen opció. Kérjük, próbálja újra.',
    msg_added: '✅ Az üzenet hozzáadva a #{number} jegyhez.',
    no_open_ticket: '💡 Nincs nyitott jegye. Először hozzon létre egyet:',
    reply_usage: 'Használat: /reply <jegy_azonosító> <üzenet>',
    reply_hint: '💬 Válasz erre a jegyre:\n/reply {number} üzenetét',
    statuses: { open: 'Nyitott', in_progress: 'Folyamatban', pending: 'Függőben', resolved: 'Megoldva', closed: 'Lezárva' },
    priorities: { low: 'Alacsony', normal: 'Normál', high: 'Magas', urgent: 'Sürgős' }
  },

  tr: {
    name: 'Türkçe', flag: '🇹🇷',
    choose_lang: '🌐 Lütfen dilinizi seçin:',
    lang_set: '✅ Dil Türkçe olarak ayarlandı.',
    guide:
`👋 *ToonPay Destek'e hoş geldiniz!*

📝 *Talep oluşturma*
• "Talep Oluştur" düğmesine dokunun veya /newticket gönderin
• Bir kategori seçin, sorununuzu açıklayın
• #1042 gibi bir talep numarası alırsınız

📊 *Talep durumu*
/status <id> — belirli talebi kontrol et
/mytickets — tüm talepleri listele

💬 *Talebe yanıt ver*
Mesaj yazın — otomatik olarak eklenir
Veya /reply <id> <metin>

🌐 *Dil* — /language
📖 *Yardım* — /guide
❌ *İptal* — /cancel

7/24 yanıt veriyoruz. 🚀`,
    btn_create: '➕ Talep Oluştur',
    btn_mytickets: '📋 Taleplerim',
    btn_guide: '📖 Yardım',
    btn_change_lang: '🌐 Dil Değiştir',
    newticket_choose_cat: '📂 Bir kategori seçin:',
    cat_payment: '💳 Ödeme / Para Yatırma',
    cat_withdrawal: '💸 Para Çekme',
    cat_kyc: '🆔 KYC Doğrulama',
    cat_card: '💳 Kart Sorunu',
    cat_account: '🔐 Hesap Erişimi',
    cat_other: '❓ Diğer',
    newticket_describe: '✍️ Lütfen sorununuzu ayrıntılı olarak açıklayın.\nİşlem kimliği, cüzdan adresi veya hata mesajı ekleyin.',
    ticket_created: '✅ *#{number}* numaralı talep oluşturuldu!\n\nBir temsilci kısa süre içinde yanıt verecek.\nDurumu /status {number} ile kontrol edin.',
    no_tickets: '📭 Henüz talebiniz yok.\n/newticket ile oluşturun.',
    mytickets_header: '📋 *Talepleriniz:*\n',
    status_usage: 'Kullanım: /status <talep_id>\nÖrnek: /status 1042',
    status_not_found: '❌ Talep bulunamadı veya size ait değil.',
    status_result: '🎫 *Talep #{number}*\n\nDurum: {status}\nÖncelik: {priority}\nOluşturuldu: {date}',
    cancelled: '❌ İptal edildi.',
    invalid_option: '⚠️ Geçersiz seçenek. Tekrar deneyin.',
    msg_added: '✅ Mesajınız #{number} numaralı talebe eklendi.',
    no_open_ticket: '💡 Açık talebiniz yok. Önce bir tane oluşturun:',
    reply_usage: 'Kullanım: /reply <talep_id> <mesaj>',
    reply_hint: '💬 Bu talebe yanıt verin:\n/reply {number} mesajınız',
    statuses: { open: 'Açık', in_progress: 'İşlemde', pending: 'Beklemede', resolved: 'Çözüldü', closed: 'Kapalı' },
    priorities: { low: 'Düşük', normal: 'Normal', high: 'Yüksek', urgent: 'Acil' }
  },

  ru: {
    name: 'Русский', flag: '🇷🇺',
    choose_lang: '🌐 Пожалуйста, выберите язык:',
    lang_set: '✅ Язык изменён на русский.',
    guide:
`👋 *Добро пожаловать в поддержку ToonPay!*

📝 *Создание тикета*
• Нажмите "Создать тикет" или отправьте /newticket
• Выберите категорию и опишите проблему
• Получите номер тикета, например #1042

📊 *Проверка статуса*
/status <id> — проверить тикет
/mytickets — все ваши тикеты

💬 *Ответ на тикет*
Просто напишите сообщение — добавится автоматически
Или /reply <id> <текст>

🌐 *Язык* — /language
📖 *Справка* — /guide
❌ *Отмена* — /cancel

Отвечаем 24/7. 🚀`,
    btn_create: '➕ Создать тикет',
    btn_mytickets: '📋 Мои тикеты',
    btn_guide: '📖 Справка',
    btn_change_lang: '🌐 Сменить язык',
    newticket_choose_cat: '📂 Выберите категорию:',
    cat_payment: '💳 Платёж / Депозит',
    cat_withdrawal: '💸 Вывод средств',
    cat_kyc: '🆔 Верификация KYC',
    cat_card: '💳 Проблема с картой',
    cat_account: '🔐 Доступ к аккаунту',
    cat_other: '❓ Другое',
    newticket_describe: '✍️ Пожалуйста, опишите проблему подробно.\nУкажите ID транзакции, адрес кошелька или текст ошибки.',
    ticket_created: '✅ Создан тикет *#{number}*!\n\nАгент ответит в ближайшее время.\nИспользуйте /status {number} для проверки статуса.',
    no_tickets: '📭 У вас пока нет тикетов.\nСоздайте с помощью /newticket.',
    mytickets_header: '📋 *Ваши тикеты:*\n',
    status_usage: 'Использование: /status <id_тикета>\nПример: /status 1042',
    status_not_found: '❌ Тикет не найден или не принадлежит вам.',
    status_result: '🎫 *Тикет #{number}*\n\nСтатус: {status}\nПриоритет: {priority}\nСоздан: {date}',
    cancelled: '❌ Отменено.',
    invalid_option: '⚠️ Неверный вариант. Попробуйте снова.',
    msg_added: '✅ Ваше сообщение добавлено в тикет #{number}.',
    no_open_ticket: '💡 У вас нет открытого тикета. Сначала создайте его:',
    reply_usage: 'Использование: /reply <id_тикета> <сообщение>',
    reply_hint: '💬 Ответить на этот тикет:\n/reply {number} ваше сообщение',
    statuses: { open: 'Открыт', in_progress: 'В работе', pending: 'Ожидание', resolved: 'Решён', closed: 'Закрыт' },
    priorities: { low: 'Низкий', normal: 'Обычный', high: 'Высокий', urgent: 'Срочный' }
  },

  fr: {
    name: 'Français', flag: '🇫🇷',
    choose_lang: '🌐 Veuillez sélectionner votre langue :',
    lang_set: '✅ Langue définie sur le français.',
    guide:
`👋 *Bienvenue au Support ToonPay !*

📝 *Créer un ticket*
• Appuyez sur "Créer un ticket" ou envoyez /newticket
• Choisissez une catégorie et décrivez votre problème
• Vous recevrez un ID de ticket comme #1042

📊 *Vérifier le statut*
/status <id> — vérifier un ticket
/mytickets — tous vos tickets

💬 *Répondre au ticket*
Tapez simplement un message — ajouté automatiquement
Ou /reply <id> <texte>

🌐 *Langue* — /language
📖 *Aide* — /guide
❌ *Annuler* — /cancel

Nous répondons 24h/24. 🚀`,
    btn_create: '➕ Créer un ticket',
    btn_mytickets: '📋 Mes tickets',
    btn_guide: '📖 Aide',
    btn_change_lang: '🌐 Changer de langue',
    newticket_choose_cat: '📂 Choisissez une catégorie :',
    cat_payment: '💳 Paiement / Dépôt',
    cat_withdrawal: '💸 Retrait',
    cat_kyc: '🆔 Vérification KYC',
    cat_card: '💳 Problème de carte',
    cat_account: '🔐 Accès au compte',
    cat_other: '❓ Autre',
    newticket_describe: '✍️ Décrivez votre problème en détail.\nIncluez l\'ID de transaction, l\'adresse du portefeuille ou le message d\'erreur.',
    ticket_created: '✅ Ticket *#{number}* créé !\n\nUn agent répondra bientôt.\nUtilisez /status {number} pour vérifier le statut.',
    no_tickets: '📭 Vous n\'avez aucun ticket.\nUtilisez /newticket pour en créer un.',
    mytickets_header: '📋 *Vos tickets :*\n',
    status_usage: 'Utilisation : /status <id_ticket>\nExemple : /status 1042',
    status_not_found: '❌ Ticket introuvable ou ne vous appartient pas.',
    status_result: '🎫 *Ticket #{number}*\n\nStatut : {status}\nPriorité : {priority}\nCréé : {date}',
    cancelled: '❌ Annulé.',
    invalid_option: '⚠️ Option invalide. Réessayez.',
    msg_added: '✅ Votre message a été ajouté au ticket #{number}.',
    no_open_ticket: '💡 Aucun ticket ouvert. Créez-en un d\'abord :',
    reply_usage: 'Utilisation : /reply <id_ticket> <message>',
    reply_hint: '💬 Répondre à ce ticket :\n/reply {number} votre message',
    statuses: { open: 'Ouvert', in_progress: 'En cours', pending: 'En attente', resolved: 'Résolu', closed: 'Fermé' },
    priorities: { low: 'Basse', normal: 'Normale', high: 'Haute', urgent: 'Urgente' }
  },

  it: {
    name: 'Italiano', flag: '🇮🇹',
    choose_lang: '🌐 Seleziona la tua lingua:',
    lang_set: '✅ Lingua impostata su Italiano.',
    guide:
`👋 *Benvenuto nel Supporto ToonPay!*

📝 *Crea un ticket*
• Tocca "Crea Ticket" o invia /newticket
• Scegli una categoria e descrivi il problema
• Riceverai un ID ticket come #1042

📊 *Stato del ticket*
/status <id> — verifica un ticket
/mytickets — elenco dei tuoi ticket

💬 *Rispondi al ticket*
Basta scrivere un messaggio — aggiunto automaticamente
Oppure /reply <id> <testo>

🌐 *Lingua* — /language
📖 *Aiuto* — /guide
❌ *Annulla* — /cancel

Rispondiamo 24/7. 🚀`,
    btn_create: '➕ Crea Ticket',
    btn_mytickets: '📋 I Miei Ticket',
    btn_guide: '📖 Aiuto',
    btn_change_lang: '🌐 Cambia Lingua',
    newticket_choose_cat: '📂 Scegli una categoria:',
    cat_payment: '💳 Pagamento / Deposito',
    cat_withdrawal: '💸 Prelievo',
    cat_kyc: '🆔 Verifica KYC',
    cat_card: '💳 Problema Carta',
    cat_account: '🔐 Accesso Account',
    cat_other: '❓ Altro',
    newticket_describe: '✍️ Descrivi il problema in dettaglio.\nIncludi ID transazione, indirizzo wallet o messaggio di errore.',
    ticket_created: '✅ Ticket *#{number}* creato!\n\nUn agente risponderà a breve.\nUsa /status {number} per verificare lo stato.',
    no_tickets: '📭 Non hai ancora ticket.\nUsa /newticket per crearne uno.',
    mytickets_header: '📋 *I tuoi ticket:*\n',
    status_usage: 'Uso: /status <id_ticket>\nEsempio: /status 1042',
    status_not_found: '❌ Ticket non trovato o non tuo.',
    status_result: '🎫 *Ticket #{number}*\n\nStato: {status}\nPriorità: {priority}\nCreato: {date}',
    cancelled: '❌ Annullato.',
    invalid_option: '⚠️ Opzione non valida. Riprova.',
    msg_added: '✅ Il tuo messaggio è stato aggiunto al ticket #{number}.',
    no_open_ticket: '💡 Nessun ticket aperto. Creane uno prima:',
    reply_usage: 'Uso: /reply <id_ticket> <messaggio>',
    reply_hint: '💬 Rispondi a questo ticket:\n/reply {number} il tuo messaggio',
    statuses: { open: 'Aperto', in_progress: 'In Corso', pending: 'In Attesa', resolved: 'Risolto', closed: 'Chiuso' },
    priorities: { low: 'Bassa', normal: 'Normale', high: 'Alta', urgent: 'Urgente' }
  },

  pt: {
    name: 'Português', flag: '🇵🇹',
    choose_lang: '🌐 Selecione o seu idioma:',
    lang_set: '✅ Idioma definido para Português.',
    guide:
`👋 *Bem-vindo ao Suporte ToonPay!*

📝 *Criar um ticket*
• Toque em "Criar Ticket" ou envie /newticket
• Escolha uma categoria e descreva o problema
• Você receberá um ID como #1042

📊 *Verificar status*
/status <id> — verificar um ticket
/mytickets — listar todos os tickets

💬 *Responder ao ticket*
Basta digitar uma mensagem — adicionada automaticamente
Ou /reply <id> <texto>

🌐 *Idioma* — /language
📖 *Ajuda* — /guide
❌ *Cancelar* — /cancel

Respondemos 24/7. 🚀`,
    btn_create: '➕ Criar Ticket',
    btn_mytickets: '📋 Meus Tickets',
    btn_guide: '📖 Ajuda',
    btn_change_lang: '🌐 Mudar Idioma',
    newticket_choose_cat: '📂 Escolha uma categoria:',
    cat_payment: '💳 Pagamento / Depósito',
    cat_withdrawal: '💸 Saque',
    cat_kyc: '🆔 Verificação KYC',
    cat_card: '💳 Problema com Cartão',
    cat_account: '🔐 Acesso à Conta',
    cat_other: '❓ Outro',
    newticket_describe: '✍️ Descreva o problema em detalhes.\nInclua ID de transação, endereço da carteira ou mensagem de erro.',
    ticket_created: '✅ Ticket *#{number}* criado!\n\nUm agente responderá em breve.\nUse /status {number} para verificar o status.',
    no_tickets: '📭 Você ainda não tem tickets.\nUse /newticket para criar um.',
    mytickets_header: '📋 *Seus tickets:*\n',
    status_usage: 'Uso: /status <id_ticket>\nExemplo: /status 1042',
    status_not_found: '❌ Ticket não encontrado ou não pertence a você.',
    status_result: '🎫 *Ticket #{number}*\n\nStatus: {status}\nPrioridade: {priority}\nCriado: {date}',
    cancelled: '❌ Cancelado.',
    invalid_option: '⚠️ Opção inválida. Tente novamente.',
    msg_added: '✅ Sua mensagem foi adicionada ao ticket #{number}.',
    no_open_ticket: '💡 Sem ticket aberto. Crie um primeiro:',
    reply_usage: 'Uso: /reply <id_ticket> <mensagem>',
    reply_hint: '💬 Responder a este ticket:\n/reply {number} sua mensagem',
    statuses: { open: 'Aberto', in_progress: 'Em Andamento', pending: 'Pendente', resolved: 'Resolvido', closed: 'Fechado' },
    priorities: { low: 'Baixa', normal: 'Normal', high: 'Alta', urgent: 'Urgente' }
  },

  zh: {
    name: '中文', flag: '🇨🇳',
    choose_lang: '🌐 请选择您的语言：',
    lang_set: '✅ 语言已设为中文。',
    guide:
`👋 *欢迎使用 ToonPay 客服！*

📝 *创建工单*
• 点击"创建工单"或发送 /newticket
• 选择类别并描述您的问题
• 您将获得如 #1042 的工单编号

📊 *查看工单状态*
/status <编号> — 查看指定工单
/mytickets — 列出所有工单

💬 *回复工单*
直接输入消息 — 自动添加到打开的工单
或使用 /reply <编号> <内容>

🌐 *语言* — /language
📖 *帮助* — /guide
❌ *取消* — /cancel

7×24 小时为您服务。🚀`,
    btn_create: '➕ 创建工单',
    btn_mytickets: '📋 我的工单',
    btn_guide: '📖 帮助',
    btn_change_lang: '🌐 更改语言',
    newticket_choose_cat: '📂 请选择工单类别：',
    cat_payment: '💳 支付 / 充值',
    cat_withdrawal: '💸 提现',
    cat_kyc: '🆔 KYC 认证',
    cat_card: '💳 卡片问题',
    cat_account: '🔐 账户访问',
    cat_other: '❓ 其他',
    newticket_describe: '✍️ 请详细描述您的问题。\n请包含交易 ID、钱包地址或错误信息。',
    ticket_created: '✅ 工单 *#{number}* 已创建！\n\n客服将尽快回复。\n使用 /status {number} 查看状态。',
    no_tickets: '📭 您还没有工单。\n使用 /newticket 创建。',
    mytickets_header: '📋 *您的工单：*\n',
    status_usage: '用法：/status <工单编号>\n例如：/status 1042',
    status_not_found: '❌ 未找到工单或工单不属于您。',
    status_result: '🎫 *工单 #{number}*\n\n状态：{status}\n优先级：{priority}\n创建时间：{date}',
    cancelled: '❌ 已取消。',
    invalid_option: '⚠️ 无效选项，请重试。',
    msg_added: '✅ 您的消息已添加到工单 #{number}。',
    no_open_ticket: '💡 您还没有打开的工单，请先创建：',
    reply_usage: '用法：/reply <工单编号> <消息>',
    reply_hint: '💬 回复此工单：\n/reply {number} 您的消息',
    statuses: { open: '开启', in_progress: '处理中', pending: '待处理', resolved: '已解决', closed: '已关闭' },
    priorities: { low: '低', normal: '普通', high: '高', urgent: '紧急' }
  },

  ja: {
    name: '日本語', flag: '🇯🇵',
    choose_lang: '🌐 言語を選択してください:',
    lang_set: '✅ 言語を日本語に設定しました。',
    guide:
`👋 *ToonPay サポートへようこそ！*

📝 *チケット作成*
• 「チケット作成」をタップ、または /newticket を送信
• カテゴリを選択し、問題を説明してください
• #1042 のようなチケット ID を受け取ります

📊 *ステータス確認*
/status <ID> — 特定のチケットを確認
/mytickets — すべてのチケットを表示

💬 *チケットに返信*
メッセージを入力するだけ — 自動的に追加されます
または /reply <ID> <テキスト>

🌐 *言語* — /language
📖 *ヘルプ* — /guide
❌ *キャンセル* — /cancel

年中無休で対応します。🚀`,
    btn_create: '➕ チケット作成',
    btn_mytickets: '📋 マイチケット',
    btn_guide: '📖 ヘルプ',
    btn_change_lang: '🌐 言語変更',
    newticket_choose_cat: '📂 カテゴリを選択してください:',
    cat_payment: '💳 支払い / 入金',
    cat_withdrawal: '💸 出金',
    cat_kyc: '🆔 KYC 認証',
    cat_card: '💳 カードの問題',
    cat_account: '🔐 アカウントアクセス',
    cat_other: '❓ その他',
    newticket_describe: '✍️ 問題を詳しく説明してください。\n取引 ID、ウォレットアドレス、エラーメッセージを含めてください。',
    ticket_created: '✅ チケット *#{number}* を作成しました！\n\n担当者よりすぐに返信します。\n/status {number} でステータスを確認できます。',
    no_tickets: '📭 チケットはまだありません。\n/newticket で作成してください。',
    mytickets_header: '📋 *あなたのチケット:*\n',
    status_usage: '使用法: /status <チケットID>\n例: /status 1042',
    status_not_found: '❌ チケットが見つからないか、あなたのものではありません。',
    status_result: '🎫 *チケット #{number}*\n\nステータス: {status}\n優先度: {priority}\n作成日: {date}',
    cancelled: '❌ キャンセルしました。',
    invalid_option: '⚠️ 無効なオプションです。もう一度お試しください。',
    msg_added: '✅ メッセージがチケット #{number} に追加されました。',
    no_open_ticket: '💡 開いているチケットがありません。まず作成してください:',
    reply_usage: '使用法: /reply <チケットID> <メッセージ>',
    reply_hint: '💬 このチケットに返信:\n/reply {number} メッセージ',
    statuses: { open: 'オープン', in_progress: '対応中', pending: '保留中', resolved: '解決済み', closed: 'クローズ' },
    priorities: { low: '低', normal: '通常', high: '高', urgent: '緊急' }
  },

  ko: {
    name: '한국어', flag: '🇰🇷',
    choose_lang: '🌐 언어를 선택하세요:',
    lang_set: '✅ 언어가 한국어로 설정되었습니다.',
    guide:
`👋 *ToonPay 지원에 오신 것을 환영합니다!*

📝 *티켓 생성*
• "티켓 생성"을 누르거나 /newticket을 보내세요
• 카테고리를 선택하고 문제를 설명하세요
• #1042와 같은 티켓 ID를 받게 됩니다

📊 *티켓 상태 확인*
/status <ID> — 특정 티켓 확인
/mytickets — 모든 티켓 보기

💬 *티켓에 답변*
메시지를 입력하세요 — 자동으로 추가됩니다
또는 /reply <ID> <텍스트>

🌐 *언어* — /language
📖 *도움말* — /guide
❌ *취소* — /cancel

24/7 응답합니다. 🚀`,
    btn_create: '➕ 티켓 생성',
    btn_mytickets: '📋 내 티켓',
    btn_guide: '📖 도움말',
    btn_change_lang: '🌐 언어 변경',
    newticket_choose_cat: '📂 카테고리를 선택하세요:',
    cat_payment: '💳 결제 / 입금',
    cat_withdrawal: '💸 출금',
    cat_kyc: '🆔 KYC 인증',
    cat_card: '💳 카드 문제',
    cat_account: '🔐 계정 접근',
    cat_other: '❓ 기타',
    newticket_describe: '✍️ 문제를 자세히 설명해 주세요.\n거래 ID, 지갑 주소 또는 오류 메시지를 포함하세요.',
    ticket_created: '✅ 티켓 *#{number}* 생성됨!\n\n상담원이 곧 답변할 예정입니다.\n/status {number}로 상태를 확인하세요.',
    no_tickets: '📭 아직 티켓이 없습니다.\n/newticket으로 생성하세요.',
    mytickets_header: '📋 *내 티켓:*\n',
    status_usage: '사용법: /status <티켓ID>\n예: /status 1042',
    status_not_found: '❌ 티켓을 찾을 수 없거나 본인의 것이 아닙니다.',
    status_result: '🎫 *티켓 #{number}*\n\n상태: {status}\n우선순위: {priority}\n생성일: {date}',
    cancelled: '❌ 취소됨.',
    invalid_option: '⚠️ 잘못된 옵션입니다. 다시 시도하세요.',
    msg_added: '✅ 메시지가 티켓 #{number}에 추가되었습니다.',
    no_open_ticket: '💡 열린 티켓이 없습니다. 먼저 생성하세요:',
    reply_usage: '사용법: /reply <티켓ID> <메시지>',
    reply_hint: '💬 이 티켓에 답변:\n/reply {number} 메시지',
    statuses: { open: '열림', in_progress: '진행 중', pending: '대기 중', resolved: '해결됨', closed: '종료' },
    priorities: { low: '낮음', normal: '보통', high: '높음', urgent: '긴급' }
  },

  ar: {
    name: 'العربية', flag: '🇸🇦',
    choose_lang: '🌐 الرجاء اختيار اللغة:',
    lang_set: '✅ تم ضبط اللغة على العربية.',
    guide:
`👋 *مرحبًا بك في دعم ToonPay!*

📝 *إنشاء تذكرة*
• اضغط على "إنشاء تذكرة" أو أرسل /newticket
• اختر فئة ووصف مشكلتك
• ستحصل على رقم تذكرة مثل #1042

📊 *التحقق من حالة التذكرة*
/status <المعرف> — التحقق من تذكرة محددة
/mytickets — جميع تذاكرك

💬 *الرد على التذكرة*
اكتب رسالة فقط — تُضاف تلقائيًا
أو استخدم /reply <المعرف> <النص>

🌐 *اللغة* — /language
📖 *مساعدة* — /guide
❌ *إلغاء* — /cancel

نرد على مدار الساعة. 🚀`,
    btn_create: '➕ إنشاء تذكرة',
    btn_mytickets: '📋 تذاكري',
    btn_guide: '📖 مساعدة',
    btn_change_lang: '🌐 تغيير اللغة',
    newticket_choose_cat: '📂 اختر فئة التذكرة:',
    cat_payment: '💳 الدفع / الإيداع',
    cat_withdrawal: '💸 السحب',
    cat_kyc: '🆔 التحقق من KYC',
    cat_card: '💳 مشكلة البطاقة',
    cat_account: '🔐 الوصول إلى الحساب',
    cat_other: '❓ أخرى',
    newticket_describe: '✍️ يرجى وصف مشكلتك بالتفصيل.\nأرفق معرف المعاملة أو عنوان المحفظة أو رسالة الخطأ.',
    ticket_created: '✅ تم إنشاء التذكرة *#{number}*!\n\nسيرد الوكيل قريبًا.\nاستخدم /status {number} للتحقق من الحالة.',
    no_tickets: '📭 ليس لديك تذاكر بعد.\nاستخدم /newticket لإنشاء واحدة.',
    mytickets_header: '📋 *تذاكرك:*\n',
    status_usage: 'الاستخدام: /status <معرف_التذكرة>\nمثال: /status 1042',
    status_not_found: '❌ التذكرة غير موجودة أو لا تنتمي إليك.',
    status_result: '🎫 *التذكرة #{number}*\n\nالحالة: {status}\nالأولوية: {priority}\nتاريخ الإنشاء: {date}',
    cancelled: '❌ تم الإلغاء.',
    invalid_option: '⚠️ خيار غير صالح. حاول مرة أخرى.',
    msg_added: '✅ تمت إضافة رسالتك إلى التذكرة #{number}.',
    no_open_ticket: '💡 لا توجد تذكرة مفتوحة. أنشئ واحدة أولاً:',
    reply_usage: 'الاستخدام: /reply <معرف_التذكرة> <الرسالة>',
    reply_hint: '💬 الرد على هذه التذكرة:\n/reply {number} رسالتك',
    statuses: { open: 'مفتوحة', in_progress: 'قيد المعالجة', pending: 'قيد الانتظار', resolved: 'تم الحل', closed: 'مغلقة' },
    priorities: { low: 'منخفضة', normal: 'عادية', high: 'عالية', urgent: 'عاجلة' }
  },

  hi: {
    name: 'हिन्दी', flag: '🇮🇳',
    choose_lang: '🌐 कृपया अपनी भाषा चुनें:',
    lang_set: '✅ भाषा हिन्दी पर सेट की गई।',
    guide:
`👋 *ToonPay सहायता में आपका स्वागत है!*

📝 *टिकट बनाएं*
• "टिकट बनाएं" पर टैप करें या /newticket भेजें
• श्रेणी चुनें और अपनी समस्या बताएं
• आपको #1042 जैसा टिकट ID मिलेगा

📊 *टिकट स्थिति जांचें*
/status <आईडी> — विशिष्ट टिकट जांचें
/mytickets — सभी टिकट देखें

💬 *टिकट का जवाब दें*
बस संदेश लिखें — स्वचालित रूप से जुड़ेगा
या /reply <आईडी> <पाठ>

🌐 *भाषा* — /language
📖 *सहायता* — /guide
❌ *रद्द करें* — /cancel

हम 24/7 उपलब्ध हैं। 🚀`,
    btn_create: '➕ टिकट बनाएं',
    btn_mytickets: '📋 मेरे टिकट',
    btn_guide: '📖 सहायता',
    btn_change_lang: '🌐 भाषा बदलें',
    newticket_choose_cat: '📂 श्रेणी चुनें:',
    cat_payment: '💳 भुगतान / जमा',
    cat_withdrawal: '💸 निकासी',
    cat_kyc: '🆔 KYC सत्यापन',
    cat_card: '💳 कार्ड समस्या',
    cat_account: '🔐 खाता पहुँच',
    cat_other: '❓ अन्य',
    newticket_describe: '✍️ कृपया अपनी समस्या विस्तार से बताएं।\nलेन-देन आईडी, वॉलेट पता या त्रुटि संदेश शामिल करें।',
    ticket_created: '✅ टिकट *#{number}* बनाया गया!\n\nएजेंट जल्द उत्तर देगा।\nस्थिति देखने के लिए /status {number} का उपयोग करें।',
    no_tickets: '📭 आपके पास अभी कोई टिकट नहीं है।\n/newticket से बनाएं।',
    mytickets_header: '📋 *आपके टिकट:*\n',
    status_usage: 'उपयोग: /status <टिकट_आईडी>\nउदाहरण: /status 1042',
    status_not_found: '❌ टिकट नहीं मिला या आपका नहीं है।',
    status_result: '🎫 *टिकट #{number}*\n\nस्थिति: {status}\nप्राथमिकता: {priority}\nबनाया गया: {date}',
    cancelled: '❌ रद्द किया गया।',
    invalid_option: '⚠️ अमान्य विकल्प। पुनः प्रयास करें।',
    msg_added: '✅ आपका संदेश टिकट #{number} में जोड़ा गया।',
    no_open_ticket: '💡 कोई खुला टिकट नहीं है। पहले एक बनाएं:',
    reply_usage: 'उपयोग: /reply <टिकट_आईडी> <संदेश>',
    reply_hint: '💬 इस टिकट का जवाब दें:\n/reply {number} आपका संदेश',
    statuses: { open: 'खुला', in_progress: 'प्रगति में', pending: 'लंबित', resolved: 'हल किया गया', closed: 'बंद' },
    priorities: { low: 'कम', normal: 'सामान्य', high: 'उच्च', urgent: 'अत्यावश्यक' }
  },

  bn: {
    name: 'বাংলা', flag: '🇧🇩',
    choose_lang: '🌐 অনুগ্রহ করে আপনার ভাষা নির্বাচন করুন:',
    lang_set: '✅ ভাষা বাংলায় সেট করা হয়েছে।',
    guide:
`👋 *ToonPay সাপোর্টে স্বাগতম!*

📝 *টিকিট তৈরি করুন*
• "টিকিট তৈরি করুন" ট্যাপ করুন বা /newticket পাঠান
• একটি বিভাগ বেছে নিন এবং সমস্যা বর্ণনা করুন
• আপনি #1042 এর মতো টিকিট আইডি পাবেন

📊 *টিকিট স্ট্যাটাস দেখুন*
/status <আইডি> — নির্দিষ্ট টিকিট দেখুন
/mytickets — আপনার সব টিকিট

💬 *টিকিটে উত্তর দিন*
শুধু একটি বার্তা লিখুন — স্বয়ংক্রিয়ভাবে যোগ হবে
অথবা /reply <আইডি> <বার্তা>

🌐 *ভাষা* — /language
📖 *সহায়তা* — /guide
❌ *বাতিল* — /cancel

আমরা ২৪/৭ উপলব্ধ। 🚀`,
    btn_create: '➕ টিকিট তৈরি করুন',
    btn_mytickets: '📋 আমার টিকিট',
    btn_guide: '📖 সহায়তা',
    btn_change_lang: '🌐 ভাষা পরিবর্তন',
    newticket_choose_cat: '📂 একটি বিভাগ বেছে নিন:',
    cat_payment: '💳 পেমেন্ট / ডিপোজিট',
    cat_withdrawal: '💸 উইথড্রয়াল',
    cat_kyc: '🆔 KYC যাচাই',
    cat_card: '💳 কার্ড সমস্যা',
    cat_account: '🔐 অ্যাকাউন্ট অ্যাক্সেস',
    cat_other: '❓ অন্যান্য',
    newticket_describe: '✍️ অনুগ্রহ করে আপনার সমস্যা বিস্তারিত বর্ণনা করুন।\nলেনদেন আইডি, ওয়ালেট ঠিকানা বা ত্রুটি বার্তা দিন।',
    ticket_created: '✅ টিকিট *#{number}* তৈরি হয়েছে!\n\nএকজন এজেন্ট শীঘ্রই উত্তর দেবেন।\nস্ট্যাটাস দেখতে /status {number} ব্যবহার করুন।',
    no_tickets: '📭 আপনার এখনও কোনও টিকিট নেই।\n/newticket দিয়ে তৈরি করুন।',
    mytickets_header: '📋 *আপনার টিকিট:*\n',
    status_usage: 'ব্যবহার: /status <টিকিট_আইডি>\nউদাহরণ: /status 1042',
    status_not_found: '❌ টিকিট পাওয়া যায়নি বা আপনার নয়।',
    status_result: '🎫 *টিকিট #{number}*\n\nস্ট্যাটাস: {status}\nঅগ্রাধিকার: {priority}\nতৈরি: {date}',
    cancelled: '❌ বাতিল হয়েছে।',
    invalid_option: '⚠️ অবৈধ বিকল্প। আবার চেষ্টা করুন।',
    msg_added: '✅ আপনার বার্তা টিকিট #{number} এ যোগ হয়েছে।',
    no_open_ticket: '💡 কোনও খোলা টিকিট নেই। প্রথমে একটি তৈরি করুন:',
    reply_usage: 'ব্যবহার: /reply <টিকিট_আইডি> <বার্তা>',
    reply_hint: '💬 এই টিকিটে উত্তর দিন:\n/reply {number} আপনার বার্তা',
    statuses: { open: 'খোলা', in_progress: 'চলমান', pending: 'অপেক্ষমান', resolved: 'সমাধান', closed: 'বন্ধ' },
    priorities: { low: 'নিম্ন', normal: 'সাধারণ', high: 'উচ্চ', urgent: 'জরুরি' }
  },

  ur: {
    name: 'اردو', flag: '🇵🇰',
    choose_lang: '🌐 براہ کرم اپنی زبان منتخب کریں:',
    lang_set: '✅ زبان اردو پر سیٹ ہوگئی۔',
    guide:
`👋 *ToonPay سپورٹ میں خوش آمدید!*

📝 *ٹکٹ بنائیں*
• "ٹکٹ بنائیں" پر ٹیپ کریں یا /newticket بھیجیں
• زمرہ منتخب کریں اور اپنا مسئلہ بتائیں
• آپ کو #1042 جیسی ٹکٹ آئی ڈی ملے گی

📊 *ٹکٹ کی حالت چیک کریں*
/status <آئی ڈی> — مخصوص ٹکٹ چیک کریں
/mytickets — اپنے تمام ٹکٹ دیکھیں

💬 *ٹکٹ کا جواب دیں*
صرف پیغام لکھیں — خود بخود شامل ہو جائے گا
یا /reply <آئی ڈی> <متن>

🌐 *زبان* — /language
📖 *مدد* — /guide
❌ *منسوخ* — /cancel

ہم 24/7 دستیاب ہیں۔ 🚀`,
    btn_create: '➕ ٹکٹ بنائیں',
    btn_mytickets: '📋 میرے ٹکٹ',
    btn_guide: '📖 مدد',
    btn_change_lang: '🌐 زبان بدلیں',
    newticket_choose_cat: '📂 زمرہ منتخب کریں:',
    cat_payment: '💳 ادائیگی / جمع',
    cat_withdrawal: '💸 نکاسی',
    cat_kyc: '🆔 KYC تصدیق',
    cat_card: '💳 کارڈ مسئلہ',
    cat_account: '🔐 اکاؤنٹ رسائی',
    cat_other: '❓ دیگر',
    newticket_describe: '✍️ براہ کرم اپنا مسئلہ تفصیل سے بتائیں۔\nٹرانزیکشن آئی ڈی، والٹ ایڈریس یا غلطی کا پیغام شامل کریں۔',
    ticket_created: '✅ ٹکٹ *#{number}* بن گیا!\n\nایک ایجنٹ جلد جواب دے گا۔\nحالت دیکھنے کے لیے /status {number} استعمال کریں۔',
    no_tickets: '📭 ابھی آپ کا کوئی ٹکٹ نہیں۔\n/newticket سے بنائیں۔',
    mytickets_header: '📋 *آپ کے ٹکٹ:*\n',
    status_usage: 'استعمال: /status <ٹکٹ_آئی_ڈی>\nمثال: /status 1042',
    status_not_found: '❌ ٹکٹ نہیں ملا یا آپ کا نہیں۔',
    status_result: '🎫 *ٹکٹ #{number}*\n\nحالت: {status}\nترجیح: {priority}\nبنایا گیا: {date}',
    cancelled: '❌ منسوخ۔',
    invalid_option: '⚠️ غلط آپشن۔ دوبارہ کوشش کریں۔',
    msg_added: '✅ آپ کا پیغام ٹکٹ #{number} میں شامل ہو گیا۔',
    no_open_ticket: '💡 کوئی کھلا ٹکٹ نہیں۔ پہلے ایک بنائیں:',
    reply_usage: 'استعمال: /reply <ٹکٹ_آئی_ڈی> <پیغام>',
    reply_hint: '💬 اس ٹکٹ کا جواب دیں:\n/reply {number} آپ کا پیغام',
    statuses: { open: 'کھلا', in_progress: 'جاری', pending: 'زیر التواء', resolved: 'حل شدہ', closed: 'بند' },
    priorities: { low: 'کم', normal: 'عام', high: 'زیادہ', urgent: 'فوری' }
  },

  id: {
    name: 'Indonesia', flag: '🇮🇩',
    choose_lang: '🌐 Silakan pilih bahasa Anda:',
    lang_set: '✅ Bahasa diatur ke Indonesia.',
    guide:
`👋 *Selamat datang di Dukungan ToonPay!*

📝 *Buat tiket*
• Ketuk "Buat Tiket" atau kirim /newticket
• Pilih kategori dan jelaskan masalah Anda
• Anda akan menerima ID tiket seperti #1042

📊 *Periksa status tiket*
/status <id> — periksa tiket tertentu
/mytickets — daftar semua tiket Anda

💬 *Balas tiket*
Ketik pesan — ditambahkan otomatis
Atau /reply <id> <teks>

🌐 *Bahasa* — /language
📖 *Bantuan* — /guide
❌ *Batal* — /cancel

Kami merespons 24/7. 🚀`,
    btn_create: '➕ Buat Tiket',
    btn_mytickets: '📋 Tiket Saya',
    btn_guide: '📖 Bantuan',
    btn_change_lang: '🌐 Ganti Bahasa',
    newticket_choose_cat: '📂 Pilih kategori:',
    cat_payment: '💳 Pembayaran / Deposit',
    cat_withdrawal: '💸 Penarikan',
    cat_kyc: '🆔 Verifikasi KYC',
    cat_card: '💳 Masalah Kartu',
    cat_account: '🔐 Akses Akun',
    cat_other: '❓ Lainnya',
    newticket_describe: '✍️ Jelaskan masalah Anda secara detail.\nSertakan ID transaksi, alamat wallet, atau pesan kesalahan.',
    ticket_created: '✅ Tiket *#{number}* dibuat!\n\nAgen akan segera membalas.\nGunakan /status {number} untuk memeriksa status.',
    no_tickets: '📭 Anda belum punya tiket.\nGunakan /newticket untuk membuat.',
    mytickets_header: '📋 *Tiket Anda:*\n',
    status_usage: 'Penggunaan: /status <id_tiket>\nContoh: /status 1042',
    status_not_found: '❌ Tiket tidak ditemukan atau bukan milik Anda.',
    status_result: '🎫 *Tiket #{number}*\n\nStatus: {status}\nPrioritas: {priority}\nDibuat: {date}',
    cancelled: '❌ Dibatalkan.',
    invalid_option: '⚠️ Opsi tidak valid. Coba lagi.',
    msg_added: '✅ Pesan Anda ditambahkan ke tiket #{number}.',
    no_open_ticket: '💡 Tidak ada tiket terbuka. Buat dulu:',
    reply_usage: 'Penggunaan: /reply <id_tiket> <pesan>',
    reply_hint: '💬 Balas tiket ini:\n/reply {number} pesan Anda',
    statuses: { open: 'Terbuka', in_progress: 'Diproses', pending: 'Tertunda', resolved: 'Selesai', closed: 'Ditutup' },
    priorities: { low: 'Rendah', normal: 'Normal', high: 'Tinggi', urgent: 'Mendesak' }
  },

  vi: {
    name: 'Tiếng Việt', flag: '🇻🇳',
    choose_lang: '🌐 Vui lòng chọn ngôn ngữ của bạn:',
    lang_set: '✅ Đã đặt ngôn ngữ thành Tiếng Việt.',
    guide:
`👋 *Chào mừng đến với Hỗ trợ ToonPay!*

📝 *Tạo phiếu hỗ trợ*
• Nhấn "Tạo Phiếu" hoặc gửi /newticket
• Chọn danh mục và mô tả vấn đề
• Bạn sẽ nhận được mã phiếu như #1042

📊 *Kiểm tra trạng thái*
/status <id> — kiểm tra phiếu cụ thể
/mytickets — xem tất cả phiếu

💬 *Trả lời phiếu*
Chỉ cần nhập tin nhắn — tự động thêm vào
Hoặc /reply <id> <văn bản>

🌐 *Ngôn ngữ* — /language
📖 *Trợ giúp* — /guide
❌ *Hủy* — /cancel

Chúng tôi hỗ trợ 24/7. 🚀`,
    btn_create: '➕ Tạo Phiếu',
    btn_mytickets: '📋 Phiếu Của Tôi',
    btn_guide: '📖 Trợ giúp',
    btn_change_lang: '🌐 Đổi Ngôn Ngữ',
    newticket_choose_cat: '📂 Chọn danh mục:',
    cat_payment: '💳 Thanh toán / Nạp tiền',
    cat_withdrawal: '💸 Rút tiền',
    cat_kyc: '🆔 Xác minh KYC',
    cat_card: '💳 Vấn đề thẻ',
    cat_account: '🔐 Truy cập tài khoản',
    cat_other: '❓ Khác',
    newticket_describe: '✍️ Vui lòng mô tả vấn đề chi tiết.\nBao gồm ID giao dịch, địa chỉ ví hoặc thông báo lỗi.',
    ticket_created: '✅ Đã tạo phiếu *#{number}*!\n\nNhân viên sẽ phản hồi sớm.\nDùng /status {number} để kiểm tra trạng thái.',
    no_tickets: '📭 Bạn chưa có phiếu nào.\nDùng /newticket để tạo.',
    mytickets_header: '📋 *Phiếu của bạn:*\n',
    status_usage: 'Cách dùng: /status <id_phiếu>\nVí dụ: /status 1042',
    status_not_found: '❌ Không tìm thấy phiếu hoặc không thuộc về bạn.',
    status_result: '🎫 *Phiếu #{number}*\n\nTrạng thái: {status}\nƯu tiên: {priority}\nTạo lúc: {date}',
    cancelled: '❌ Đã hủy.',
    invalid_option: '⚠️ Tùy chọn không hợp lệ. Thử lại.',
    msg_added: '✅ Tin nhắn của bạn đã được thêm vào phiếu #{number}.',
    no_open_ticket: '💡 Chưa có phiếu mở. Tạo trước:',
    reply_usage: 'Cách dùng: /reply <id_phiếu> <tin_nhắn>',
    reply_hint: '💬 Trả lời phiếu này:\n/reply {number} tin nhắn của bạn',
    statuses: { open: 'Mở', in_progress: 'Đang xử lý', pending: 'Chờ xử lý', resolved: 'Đã giải quyết', closed: 'Đã đóng' },
    priorities: { low: 'Thấp', normal: 'Bình thường', high: 'Cao', urgent: 'Khẩn cấp' }
  },

  th: {
    name: 'ไทย', flag: '🇹🇭',
    choose_lang: '🌐 กรุณาเลือกภาษาของคุณ:',
    lang_set: '✅ ตั้งค่าภาษาเป็นไทยแล้ว',
    guide:
`👋 *ยินดีต้อนรับสู่ฝ่ายสนับสนุน ToonPay!*

📝 *สร้างตั๋ว*
• แตะ "สร้างตั๋ว" หรือส่ง /newticket
• เลือกหมวดหมู่และอธิบายปัญหา
• คุณจะได้รับหมายเลขตั๋วเช่น #1042

📊 *ตรวจสอบสถานะตั๋ว*
/status <id> — ตรวจสอบตั๋วที่ระบุ
/mytickets — แสดงตั๋วทั้งหมด

💬 *ตอบกลับตั๋ว*
เพียงพิมพ์ข้อความ — เพิ่มโดยอัตโนมัติ
หรือ /reply <id> <ข้อความ>

🌐 *ภาษา* — /language
📖 *ช่วยเหลือ* — /guide
❌ *ยกเลิก* — /cancel

เราตอบกลับตลอด 24/7 🚀`,
    btn_create: '➕ สร้างตั๋ว',
    btn_mytickets: '📋 ตั๋วของฉัน',
    btn_guide: '📖 ช่วยเหลือ',
    btn_change_lang: '🌐 เปลี่ยนภาษา',
    newticket_choose_cat: '📂 เลือกหมวดหมู่:',
    cat_payment: '💳 การชำระเงิน / ฝาก',
    cat_withdrawal: '💸 การถอน',
    cat_kyc: '🆔 การยืนยัน KYC',
    cat_card: '💳 ปัญหาบัตร',
    cat_account: '🔐 การเข้าถึงบัญชี',
    cat_other: '❓ อื่นๆ',
    newticket_describe: '✍️ กรุณาอธิบายปัญหาโดยละเอียด\nระบุ ID ธุรกรรม ที่อยู่กระเป๋า หรือข้อความแสดงข้อผิดพลาด',
    ticket_created: '✅ สร้างตั๋ว *#{number}* แล้ว!\n\nเจ้าหน้าที่จะตอบกลับเร็วๆ นี้\nใช้ /status {number} เพื่อตรวจสอบสถานะ',
    no_tickets: '📭 คุณยังไม่มีตั๋ว\nใช้ /newticket เพื่อสร้าง',
    mytickets_header: '📋 *ตั๋วของคุณ:*\n',
    status_usage: 'การใช้งาน: /status <id_ตั๋ว>\nตัวอย่าง: /status 1042',
    status_not_found: '❌ ไม่พบตั๋วหรือไม่ใช่ของคุณ',
    status_result: '🎫 *ตั๋ว #{number}*\n\nสถานะ: {status}\nลำดับความสำคัญ: {priority}\nสร้างเมื่อ: {date}',
    cancelled: '❌ ยกเลิกแล้ว',
    invalid_option: '⚠️ ตัวเลือกไม่ถูกต้อง ลองอีกครั้ง',
    msg_added: '✅ ข้อความของคุณถูกเพิ่มในตั๋ว #{number} แล้ว',
    no_open_ticket: '💡 ไม่มีตั๋วที่เปิดอยู่ สร้างก่อน:',
    reply_usage: 'การใช้งาน: /reply <id_ตั๋ว> <ข้อความ>',
    reply_hint: '💬 ตอบกลับตั๋วนี้:\n/reply {number} ข้อความของคุณ',
    statuses: { open: 'เปิด', in_progress: 'กำลังดำเนินการ', pending: 'รอดำเนินการ', resolved: 'แก้ไขแล้ว', closed: 'ปิด' },
    priorities: { low: 'ต่ำ', normal: 'ปกติ', high: 'สูง', urgent: 'เร่งด่วน' }
  },

  nl: {
    name: 'Nederlands', flag: '🇳🇱',
    choose_lang: '🌐 Selecteer uw taal:',
    lang_set: '✅ Taal ingesteld op Nederlands.',
    guide:
`👋 *Welkom bij ToonPay Support!*

📝 *Ticket aanmaken*
• Tik op "Ticket Aanmaken" of stuur /newticket
• Kies een categorie en beschrijf uw probleem
• U ontvangt een ticket-ID zoals #1042

📊 *Ticketstatus controleren*
/status <id> — specifiek ticket controleren
/mytickets — al uw tickets bekijken

💬 *Op ticket reageren*
Typ gewoon een bericht — wordt automatisch toegevoegd
Of /reply <id> <tekst>

🌐 *Taal* — /language
📖 *Help* — /guide
❌ *Annuleren* — /cancel

Wij reageren 24/7. 🚀`,
    btn_create: '➕ Ticket Aanmaken',
    btn_mytickets: '📋 Mijn Tickets',
    btn_guide: '📖 Help',
    btn_change_lang: '🌐 Taal Wijzigen',
    newticket_choose_cat: '📂 Kies een categorie:',
    cat_payment: '💳 Betaling / Storting',
    cat_withdrawal: '💸 Opname',
    cat_kyc: '🆔 KYC-verificatie',
    cat_card: '💳 Kaartprobleem',
    cat_account: '🔐 Toegang tot account',
    cat_other: '❓ Overig',
    newticket_describe: '✍️ Beschrijf uw probleem in detail.\nVoeg transactie-ID, walletadres of foutmelding toe.',
    ticket_created: '✅ Ticket *#{number}* aangemaakt!\n\nEen medewerker reageert binnenkort.\nGebruik /status {number} om de status te controleren.',
    no_tickets: '📭 U heeft nog geen tickets.\nGebruik /newticket om er een aan te maken.',
    mytickets_header: '📋 *Uw tickets:*\n',
    status_usage: 'Gebruik: /status <ticket_id>\nVoorbeeld: /status 1042',
    status_not_found: '❌ Ticket niet gevonden of niet van u.',
    status_result: '🎫 *Ticket #{number}*\n\nStatus: {status}\nPrioriteit: {priority}\nAangemaakt: {date}',
    cancelled: '❌ Geannuleerd.',
    invalid_option: '⚠️ Ongeldige optie. Probeer opnieuw.',
    msg_added: '✅ Uw bericht is toegevoegd aan ticket #{number}.',
    no_open_ticket: '💡 Geen open ticket. Maak er eerst een aan:',
    reply_usage: 'Gebruik: /reply <ticket_id> <bericht>',
    reply_hint: '💬 Antwoord op dit ticket:\n/reply {number} uw bericht',
    statuses: { open: 'Open', in_progress: 'In Behandeling', pending: 'In Afwachting', resolved: 'Opgelost', closed: 'Gesloten' },
    priorities: { low: 'Laag', normal: 'Normaal', high: 'Hoog', urgent: 'Urgent' }
  }
};

// Order for the language selection keyboard (2 columns):
// EN, ES, DE, HU, TR, RU, FR, IT, PT, ZH, JA, KO, AR, HI, BN, UR, ID, VI, TH, NL
const LANGUAGE_ORDER = [
  'en','es','de','hu','tr','ru','fr','it','pt','zh',
  'ja','ko','ar','hi','bn','ur','id','vi','th','nl'
];

function t(lang, key) {
  const L = LANGUAGES[lang] || LANGUAGES.en;
  const v = L[key];
  if (v === undefined) return LANGUAGES.en[key] ?? key;
  return v;
}

function languageName(code) { return (LANGUAGES[code] || LANGUAGES.en).name; }
function languageFlag(code) { return (LANGUAGES[code] || LANGUAGES.en).flag; }

function formatTemplate(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

module.exports = { LANGUAGES, LANGUAGE_ORDER, t, languageName, languageFlag, formatTemplate };
