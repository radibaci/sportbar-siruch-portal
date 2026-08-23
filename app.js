const club = {
  name: "Sportbar Siruch",
  logoText: "DM",
  logoUrl: "assets/club-logo-dm-192.png",
  open: "8:00",
  close: "21:00",
  slotMinutes: 30,
  currency: "Kc",
  defaultDurations: [30, 60, 90, 120, 150, 180],
  cancellationMinutes: 30
};

const currentUser = {
  name: "Radim",
  initials: "RA",
  credit: 1840,
  paidCredit: 1840,
  bonusCredit: 0,
  currency: "Kc",
  playerType: "club",
  discount: 18,
  baseDiscount: 15,
  loyaltyDiscount: 3,
  playedHours: 74,
  nextLoyaltyHours: 100
};

const appToday = new Date();
appToday.setHours(12, 0, 0, 0);
const weekdayCodes = ["Ne", "Po", "Ut", "St", "Ct", "Pa", "So"];

function upcomingWeekdayIso(weekday, minimumDaysAhead = 0) {
  const date = new Date(appToday);
  let offset = (weekday - date.getDay() + 7) % 7;
  if (offset < minimumDaysAhead) offset += 7;
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const seedFridayIso = upcomingWeekdayIso(5, 1);

const state = {
  role: "player",
  persona: "radim",
  view: "home",
  selectedDay: 0,
  selectedBookingDate: "",
  calendarYear: appToday.getFullYear(),
  calendarMonth: appToday.getMonth(),
  recurringCancelled: false,
  joinedEvents: new Set(),
  joinedEventsByPlayer: {},
  guestMode: false,
  attendanceRequired: true,
  notificationsEnabled: true,
  replacementOffered: false,
  adminPlayerSearch: "",
  collapsedSections: new Set()
};

const HELP_PROGRESS_KEY = "tennis-portal-help-progress-v1";
const helpTopics = [
  {
    id: "player-booking",
    roles: ["player"],
    views: ["booking"],
    title: "Vytvoreni rezervace",
    summary: "Vyber data, kurtu, casu a spoluhrace pro single nebo double.",
    steps: [
      { target: "[data-help-target='booking-date']", title: "Vyber datum", text: "Pouzij rychly tyden nebo den v mesicnim kalendari." },
      { target: "[data-help-target='booking-courts']", title: "Vyber kurt a cas", text: "Volne pulhodiny jsou svetle zelene. Klepnutim otevres rezervaci." },
      { target: "[data-help-target='player-reservations']", title: "Zkontroluj vysledek", text: "V Moje rezervace uvidis sestavu, potvrzeni i delku hry." }
    ]
  },
  {
    id: "player-home",
    roles: ["player"],
    views: ["home"],
    title: "Oznameni a navrhy na hru",
    summary: "Potvrzeni ucasti, pozvanky, protinavrhy a hledani nahradnika.",
    steps: [
      { target: "[data-help-target='player-notifications']", title: "Oznameni", text: "Tady potvrdis pozvanku, ucast nebo vyridis zadost od spoluhrace." },
      { target: "[data-help-target='player-proposals']", title: "Navrhy na hru", text: "U navrhu vidis, kdo uz potvrdil a kdo jeste neodpovedel." },
      { target: "[data-help-target='player-reservations']", title: "Aktualni sestava", text: "Po potvrzeni se hra propise do rezervaci a kalendare." }
    ]
  },
  {
    id: "player-community",
    roles: ["player"],
    views: ["players"],
    title: "Hraci, pratele a hledani hry",
    summary: "Pozvi hrace, posli zadost o pratelstvi nebo reaguj na hledani hry.",
    steps: [
      { target: "[data-help-target='player-searches']", title: "Hledaji spoluhrace", text: "Tady uvidis otevrene hry, do kterych se muzes prihlasit." },
      { target: "[data-help-target='player-friends']", title: "Moji kamaradi", text: "Potvrzeni kamaradi se nabizeji jako prvni pri pozvani a hledani nahradnika." },
      { target: "[data-help-target='player-directory']", title: "Hraci klubu", text: "Rozbal seznam, otevri profil a posli zadost o pratelstvi nebo pozvanku na hru." }
    ]
  },
  {
    id: "player-events",
    roles: ["player"],
    views: ["events"],
    title: "Akce a turnaje",
    summary: "Podrobnosti, prihlaseni, startovne, vysledky a pozvani pratel.",
    steps: [
      { target: "[data-help-target='player-events']", title: "Otevri akci", text: "Karta ukaze termin a typ akce, detail obsahuje registraci a dalsi informace." },
      { target: "[data-help-target='player-tournaments']", title: "Turnaje", text: "U turnaje uvidis uzaverku, startovne, prihlasene a pozdeji vysledky." }
    ]
  },
  {
    id: "player-profile",
    roles: ["player"],
    views: ["profile"],
    title: "Kredit, sleva a nastaveni",
    summary: "Prehled kreditu, bonusu, vernosti a upozorneni.",
    steps: [
      { target: "[data-help-target='player-profile-summary']", title: "Profil hrace", text: "Tady zmenis fotku a zkontrolujes zakladni udaje." },
      { target: "[data-help-target='player-wallet']", title: "Kredit, sleva a vernost", text: "Vidis skladbu slevy, kredit, finalni cenu a postup do dalsi urovne." },
      { target: "[data-help-target='player-profile-settings']", title: "Rychla nastaveni", text: "Spravuj potvrzovani ucasti, kontakt, objednavky a soukromi." }
    ]
  },
  {
    id: "player-orders",
    roles: ["player"],
    views: ["orders"],
    title: "Objednavky a vyplety",
    summary: "Stav zbozi, predani k rezervaci a servis rakety.",
    steps: [
      { target: "[data-help-target='player-orders']", title: "Moje objednavky", text: "U kazde polozky vidis stav a zpusob predani v klubu." },
      { target: "[data-help-target='player-stringing']", title: "Vyplety raket", text: "Portal ukazuje, zda je raketa v klubu, u vypletace nebo pripravena k vyzvednuti." },
      { target: "[data-help-target='player-shop']", title: "Klubovy obchod", text: "Dalsi zbozi nebo servis objednas primo tady." }
    ]
  },
  {
    id: "admin-dashboard",
    roles: ["admin"],
    views: ["home"],
    title: "Prehled a nastaveni klubu",
    summary: "Vytizenost, prijmy, kurty, cenove bonusy a provozni upozorneni.",
    steps: [
      { target: "[data-help-target='admin-overview']", title: "Stav dnes", text: "Rychle zkontroluj vytizeni, rezervace a polozky k vyrizeni." },
      { target: "[data-help-target='admin-courts']", title: "Sprava kurtu", text: "Pridej kurt nebo otevri jeho nazev, povrch, dobu a cenove useky." },
      { target: "[data-help-target='admin-credit-bonus']", title: "Bonusy za kredit", text: "Nastav pravidla bonusu pri rucnim dobiti kreditu." }
    ]
  },
  {
    id: "admin-booking",
    roles: ["admin"],
    views: ["booking"],
    title: "Rezervace a specialni obsazenost",
    summary: "Rucni a trvale rezervace, blokace, turnaje, treninky a servis.",
    steps: [
      { target: "[data-help-target='admin-reservation-create']", title: "Rucni rezervace", text: "Vytvor jednorazovou nebo trvalou rezervaci za hrace." },
      { target: "[data-help-target='admin-special-occupancy']", title: "Specialni blok", text: "Vyber kurt, termin a typ obsazenosti mimo beznou hru." },
      { target: "[data-help-target='admin-day-control']", title: "Kontrola dne", text: "Rozvrh ukazuje skutecnou obsazenost kazdeho kurtu a dovoluje pridat blok primo do volneho slotu." }
    ]
  },
  {
    id: "admin-players",
    roles: ["admin"],
    views: ["players"],
    title: "Hraci, kredity a slevy",
    summary: "Vyhledani hrace, rucni kredit, sleva, poznamky a historie.",
    steps: [
      { target: "[data-help-target='admin-player-search']", title: "Najdi hrace", text: "Zadej cast jmena nebo e-mailu a potvrd hledani lupou." },
      { target: "[data-help-target='admin-player-list']", title: "Otevri kartu", text: "Karta hrace obsahuje kredit, slevy, rezervace a spravcovske poznamky." }
    ]
  },
  {
    id: "admin-events",
    roles: ["admin"],
    views: ["events"],
    title: "Akce, ankety a turnaje",
    summary: "Vytvoreni, schvaleni dodavatelem, publikace, registrace a vysledky.",
    steps: [
      { target: "[data-help-target='admin-events']", title: "Nova akce", text: "Zadej konkretni datum, detail, obrazek, kapacitu a pripadne startovne." },
      { target: "[data-help-target='admin-polls']", title: "Anketa", text: "Nech hrace hlasovat a z vysledku priprav testovaci akci." },
      { target: "[data-help-target='admin-tournaments']", title: "Turnaj", text: "Nastav registraci, skupiny, los a nasledny vyrazovaci pavouk." }
    ]
  },
  {
    id: "admin-orders",
    roles: ["admin"],
    views: ["orders"],
    title: "Objednavky a vyplety",
    summary: "Prijeti objednavky, sklad nebo dodavatel, priprava a predani hraci.",
    steps: [
      { target: "[data-help-target='admin-orders']", title: "Objednavky hracu", text: "Zkontroluj termin predani a rozhodni sklad nebo objednani u dodavatele." },
      { target: "[data-help-target='admin-stringing']", title: "Vyplety raket", text: "Sleduj predani mezi klubem a vypletacem a nachystani rakety hraci." }
    ]
  },
  {
    id: "service-role",
    roles: ["stringer", "seller"],
    views: ["home", "booking", "players", "events", "profile"],
    title: "Pracovni prehled",
    summary: "Zakazky, terminy, predani klubu a potvrzeni dodavky.",
    steps: [
      { target: "[data-help-target='service-work']", title: "Polozky k vyrizeni", text: "Zpracuj pouze polozky prirazene tve roli a aktualizuj jejich stav." },
      { target: ".bottom-nav", title: "Prepinani sekci", text: "Navigace ukazuje pracovni tok, kontakty a souvisejici akce." }
    ]
  },
  {
    id: "guest-start",
    roles: ["guest"],
    views: ["home", "booking"],
    title: "Rezervace hosta",
    summary: "Kontakt, jednorazovy kod, volny slot a pravidla uhrady na klubu.",
    steps: [
      { target: "[data-help-target='guest-entry']", title: "Zacni jako host", text: "Zadej pouze nezbytny kontakt a pokracuj na vyber terminu." },
      { target: "[data-help-target='guest-courts-heading']", title: "Vyber volny slot", text: "Pod nadpisem jsou kurty a jejich pulhodinove sloty bez pristupu k clenskym datum." }
    ]
  }
];

let activeHelpTour = null;

function currentHelpRole() {
  if (["admin", "guest", "stringer", "seller"].includes(state.role)) return state.role;
  return "player";
}

function completedHelpTopics() {
  try {
    const stored = JSON.parse(localStorage.getItem(HELP_PROGRESS_KEY) || "[]");
    return new Set(Array.isArray(stored) ? stored : []);
  } catch (_) {
    return new Set();
  }
}

function saveHelpCompletion(topicId) {
  const completed = completedHelpTopics();
  completed.add(topicId);
  try {
    localStorage.setItem(HELP_PROGRESS_KEY, JSON.stringify([...completed]));
  } catch (_) {}
}

function helpTopicById(topicId) {
  return helpTopics.find((topic) => topic.id === topicId);
}

function helpTopicsForCurrentView() {
  const role = currentHelpRole();
  return helpTopics.filter((topic) => topic.roles.includes(role) && topic.views.includes(state.view));
}

function helpCenterModal() {
  const roleLabels = {
    player: "Hrac",
    admin: "Spravce klubu",
    guest: "Host",
    stringer: "Vypletac",
    seller: "Obchodnik"
  };
  const viewLabels = {
    home: "Domu",
    booking: "Rezervace",
    players: "Hraci",
    events: "Akce",
    orders: "Objednavky",
    profile: "Profil"
  };
  const completed = completedHelpTopics();
  const current = helpTopicsForCurrentView();
  const available = helpTopics.filter((topic) => topic.roles.includes(currentHelpRole()));
  const ordered = [...current, ...available.filter((topic) => !current.includes(topic))];
  return `
    <div class="modal-body help-center">
      <div>
        <p class="eyebrow">${roleLabels[currentHelpRole()] || "Portal"} · ${viewLabels[state.view] || "Aktualni obrazovka"}</p>
        <h2 id="modalTitle">Jak vam muzeme pomoci?</h2>
        <p class="muted">Vyberte kratke tema. Prvni jsou navody pro prave otevrenou cast portalu.</p>
      </div>
      <div class="help-topic-list">
        ${ordered.map((topic) => `
          <button class="help-topic-card ${current.includes(topic) ? "is-current" : ""}" data-action="help-topic" data-topic="${topic.id}">
            <span class="help-topic-symbol" aria-hidden="true">${completed.has(topic.id) ? "✓" : "?"}</span>
            <span><strong>${topic.title}</strong><small>${topic.summary}</small></span>
            <b aria-hidden="true">›</b>
          </button>
        `).join("")}
      </div>
      <p class="help-privacy-note">Napoveda je soucasti aplikace. Nic neodesila AI ani externi sluzbe.</p>
    </div>
  `;
}

function helpTopicModal(data = {}) {
  const topic = helpTopicById(data.topic) || helpTopicsForCurrentView()[0];
  if (!topic) return helpCenterModal();
  return `
    <div class="modal-body help-topic-detail">
      <div>
        <p class="eyebrow">Napoveda krok za krokem</p>
        <h2 id="modalTitle">${topic.title}</h2>
        <p class="muted">${topic.summary}</p>
      </div>
      <ol class="help-step-list">
        ${topic.steps.map((step, index) => `
          <li><span class="help-step-number">${index + 1}</span><span><strong>${step.title}</strong><small>${step.text}</small></span></li>
        `).join("")}
      </ol>
      <button class="primary-button" data-confirm="help-start" data-topic="${topic.id}">Ukazat primo v aplikaci</button>
    </div>
  `;
}

function clearHelpTarget() {
  document.querySelectorAll(".help-target-active").forEach((element) => element.classList.remove("help-target-active"));
}

function stopHelpTour(completed = false) {
  const topic = activeHelpTour ? helpTopicById(activeHelpTour.topicId) : null;
  clearHelpTarget();
  activeHelpTour = null;
  if (helpCoachmark) {
    helpCoachmark.hidden = true;
    helpCoachmark.innerHTML = "";
  }
  if (completed && topic) {
    saveHelpCompletion(topic.id);
    showToast("Navod je dokonceny. Kdykoliv se k nemu vratite pres otaznik nahore.");
  }
}

function showHelpTourStep() {
  if (!activeHelpTour) return;
  const topic = helpTopicById(activeHelpTour.topicId);
  const steps = activeHelpTour.steps || [];
  const step = steps[activeHelpTour.step];
  if (!topic || !step) {
    stopHelpTour(false);
    return;
  }

  clearHelpTarget();
  const target = document.querySelector(step.target);
  if (!target) {
    activeHelpTour.steps = steps.filter((item) => document.querySelector(item.target));
    activeHelpTour.step = Math.min(activeHelpTour.step, Math.max(0, activeHelpTour.steps.length - 1));
    if (!activeHelpTour.steps.length) {
      stopHelpTour(false);
      showToast("Tento navod ted neni pro otevrenou obrazovku dostupny.");
      return;
    }
    showHelpTourStep();
    return;
  }
  target.classList.add("help-target-active");
  target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  const isLast = activeHelpTour.step === steps.length - 1;
  helpCoachmark.innerHTML = `
    <div class="help-coachmark-head">
      <span>Krok ${activeHelpTour.step + 1} z ${steps.length}</span>
      <button data-help-tour="close" aria-label="Zavrit napovedu" title="Zavrit">&times;</button>
    </div>
    <strong>${step.title}</strong>
    <p>${step.text}</p>
    <div class="help-coachmark-actions">
      <button class="secondary-button" data-help-tour="back" ${activeHelpTour.step === 0 ? "disabled" : ""}>Zpet</button>
      <button class="primary-button" data-help-tour="next">${isLast ? "Dokoncit" : "Dalsi"}</button>
    </div>
  `;
  helpCoachmark.hidden = false;
}

function startHelpTour(topicId) {
  const topic = helpTopicById(topicId);
  if (!topic) return;
  closeModal();
  if (!topic.views.includes(state.view)) {
    state.view = topic.views[0];
    render();
  }
  const steps = topic.steps.filter((step) => document.querySelector(step.target));
  if (!steps.length) {
    showToast("Tento navod ted neni dostupny.");
    return;
  }
  activeHelpTour = { topicId: topic.id, steps, step: 0 };
  window.setTimeout(showHelpTourStep, 60);
}

function moveHelpTour(direction) {
  if (!activeHelpTour) return;
  const topic = helpTopicById(activeHelpTour.topicId);
  if (!topic) return stopHelpTour();
  if (direction === "back") {
    activeHelpTour.step = Math.max(0, activeHelpTour.step - 1);
    showHelpTourStep();
    return;
  }
  if (activeHelpTour.step >= activeHelpTour.steps.length - 1) {
    stopHelpTour(true);
    return;
  }
  activeHelpTour.step += 1;
  showHelpTourStep();
}

const demoLoginAccounts = [
  { email: "robin@siruch.cz", password: "siruch-robin", role: "player", persona: "robin", label: "Robin" },
  { email: "bob@siruch.cz", password: "siruch-bob", role: "player", persona: "bob", label: "Bob" },
  { email: "honza@siruch.cz", password: "siruch-honza", role: "player", persona: "honza", label: "Honza" },
  { email: "marek@siruch.cz", password: "siruch-marek", role: "player", persona: "marek", label: "Marek" },
  { email: "darek@siruch.cz", password: "siruch-darek", role: "player", persona: "darek", label: "Darek" },
  { email: "filip@siruch.cz", password: "siruch-filip", role: "player", persona: "filip", label: "Filip" },
  { email: "radim@siruch.cz", password: "siruch-radim", role: "player", persona: "radim", label: "Radim" },
  { email: "zbyna@siruch.cz", password: "siruch-zbyna", role: "player", persona: "zbyna", label: "Zbyna" },
  { email: "handa@siruch.cz", password: "siruch-handa", role: "player", persona: "handa", label: "Handa" },
  { email: "prema@siruch.cz", password: "siruch-prema", role: "player", persona: "prema", label: "Prema" },
  { email: "viki@siruch.cz", password: "siruch-viki", role: "player", persona: "viki", label: "Viki" },
  { email: "spravce@siruch.cz", password: "siruch-admin", role: "admin", persona: "radim", label: "Spravce" },
  { email: "vypletac@siruch.cz", password: "siruch-vyplet", role: "stringer", persona: "radim", label: "Vypletac" },
  { email: "obchod@siruch.cz", password: "siruch-obchod", role: "seller", persona: "radim", label: "Obchod" }
];

const days = Array.from({ length: 7 }, (_, index) => {
  if (index === 0) return "Dnes";
  if (index === 1) return "Zitra";
  const date = new Date(appToday);
  date.setDate(date.getDate() + index);
  return weekdayCodes[date.getDay()];
});
const courtPhoto = "assets/court-top-view.png";

const courts = [
  {
    id: "c1",
    name: "Kurt 1",
    surface: "Antuka",
    surfaceClass: "clay-surface",
    color: "#c66532",
    photo: courtPhoto,
    reservations: [
      { isoDate: seedFridayIso, start: "17:00", end: "19:00", title: "Patecni double", type: "mine", players: ["Radim", "Robin", "Bob", "Honza"] }
    ]
  },
  {
    id: "c2",
    name: "Kurt 2",
    surface: "Umele",
    surfaceClass: "hard-surface",
    color: "#2d79c7",
    photo: courtPhoto,
    reservations: []
  },
  {
    id: "c3",
    name: "Kurt 3",
    surface: "Trava",
    surfaceClass: "grass-surface",
    color: "#3d8f51",
    photo: courtPhoto,
    reservations: []
  },
  {
    id: "c4",
    name: "Kurt 4",
    surface: "Antuka",
    surfaceClass: "clay-surface",
    color: "#c66532",
    photo: courtPhoto,
    reservations: []
  }
];

const players = [
  {
    id: "robin",
    name: "Robin",
    initials: "RO",
    relation: "club",
    gender: "male",
    accountType: "club",
    accountLabel: "Klubovy hrac",
    age: null,
    credit: 1200,
    paidCredit: 1200,
    bonusCredit: 0,
    discount: 10,
    baseDiscount: 8,
    loyaltyDiscount: 2,
    playedHours: 42,
    nextLoyaltyHours: 50,
    discountReason: "Testovaci klubovy hrac pro Sportbar Siruch.",
    seasonSpend: 0,
    seasonReservations: 0,
    adminNote: "Cisty testovaci profil bez stare historie.",
    invitedBy: "",
    level: "nezadano",
    type: "nezadano",
    time: "",
    reservationNeed: "",
    style: "nezadano",
    tournaments: "zadne",
    lastPlayed: "Zatim bez historie v nove testovaci sade.",
    record: "0 zapasu v nove testovaci sade"
  },
  {
    id: "bob",
    name: "Bob",
    initials: "BO",
    relation: "club",
    gender: "male",
    accountType: "club",
    accountLabel: "Klubovy hrac",
    age: null,
    credit: 1100,
    paidCredit: 1100,
    bonusCredit: 0,
    discount: 8,
    baseDiscount: 8,
    loyaltyDiscount: 0,
    playedHours: 21,
    nextLoyaltyHours: 50,
    discountReason: "Testovaci klubovy hrac pro Sportbar Siruch.",
    seasonSpend: 0,
    seasonReservations: 0,
    adminNote: "Cisty testovaci profil bez stare historie.",
    invitedBy: "",
    level: "nezadano",
    type: "nezadano",
    time: "",
    reservationNeed: "",
    style: "nezadano",
    tournaments: "zadne",
    lastPlayed: "Zatim bez historie v nove testovaci sade.",
    record: "0 zapasu v nove testovaci sade"
  },
  {
    id: "honza",
    name: "Honza",
    initials: "HO",
    relation: "club",
    gender: "male",
    accountType: "club",
    accountLabel: "Klubovy hrac",
    age: null,
    credit: 980,
    paidCredit: 980,
    bonusCredit: 0,
    discount: 8,
    baseDiscount: 6,
    loyaltyDiscount: 2,
    playedHours: 36,
    nextLoyaltyHours: 50,
    discountReason: "Testovaci klubovy hrac pro Sportbar Siruch.",
    seasonSpend: 0,
    seasonReservations: 0,
    adminNote: "Cisty testovaci profil bez stare historie.",
    invitedBy: "",
    level: "nezadano",
    type: "nezadano",
    time: "",
    reservationNeed: "",
    style: "nezadano",
    tournaments: "zadne",
    lastPlayed: "Zatim bez historie v nove testovaci sade.",
    record: "0 zapasu v nove testovaci sade"
  },
  {
    id: "marek",
    name: "Marek",
    initials: "MA",
    relation: "club",
    gender: "male",
    accountType: "club",
    accountLabel: "Klubovy hrac",
    age: null,
    credit: 900,
    paidCredit: 900,
    bonusCredit: 0,
    discount: 6,
    baseDiscount: 6,
    loyaltyDiscount: 0,
    playedHours: 18,
    nextLoyaltyHours: 50,
    discountReason: "Testovaci klubovy hrac pro Sportbar Siruch.",
    seasonSpend: 0,
    seasonReservations: 0,
    adminNote: "Cisty testovaci profil bez stare historie.",
    invitedBy: "",
    level: "nezadano",
    type: "nezadano",
    time: "",
    reservationNeed: "",
    style: "nezadano",
    tournaments: "zadne",
    lastPlayed: "Zatim bez historie v nove testovaci sade.",
    record: "0 zapasu v nove testovaci sade"
  },
  {
    id: "darek",
    name: "Darek",
    initials: "DA",
    relation: "club",
    gender: "male",
    accountType: "club",
    accountLabel: "Klubovy hrac",
    age: null,
    credit: 850,
    paidCredit: 850,
    bonusCredit: 0,
    discount: 6,
    baseDiscount: 5,
    loyaltyDiscount: 1,
    playedHours: 28,
    nextLoyaltyHours: 50,
    discountReason: "Testovaci klubovy hrac pro Sportbar Siruch.",
    seasonSpend: 0,
    seasonReservations: 0,
    adminNote: "Cisty testovaci profil bez stare historie.",
    invitedBy: "",
    level: "nezadano",
    type: "nezadano",
    time: "",
    reservationNeed: "",
    style: "nezadano",
    tournaments: "zadne",
    lastPlayed: "Zatim bez historie v nove testovaci sade.",
    record: "0 zapasu v nove testovaci sade"
  },
  {
    id: "filip",
    name: "Filip",
    initials: "FI",
    relation: "club",
    gender: "male",
    accountType: "club",
    accountLabel: "Klubovy hrac",
    age: null,
    credit: 1450,
    paidCredit: 1450,
    bonusCredit: 0,
    discount: 12,
    baseDiscount: 10,
    loyaltyDiscount: 2,
    playedHours: 58,
    nextLoyaltyHours: 100,
    discountReason: "Testovaci klubovy hrac pro Sportbar Siruch.",
    seasonSpend: 0,
    seasonReservations: 0,
    adminNote: "Cisty testovaci profil bez stare historie.",
    invitedBy: "",
    level: "nezadano",
    type: "nezadano",
    time: "",
    reservationNeed: "",
    style: "nezadano",
    tournaments: "zadne",
    lastPlayed: "Zatim bez historie v nove testovaci sade.",
    record: "0 zapasu v nove testovaci sade"
  },
  {
    id: "radim",
    name: "Radim",
    initials: "RA",
    relation: "club",
    gender: "male",
    accountType: "club",
    accountLabel: "Klubovy hrac",
    age: null,
    credit: 1840,
    paidCredit: 1840,
    bonusCredit: 0,
    discount: 18,
    baseDiscount: 15,
    loyaltyDiscount: 3,
    playedHours: 74,
    nextLoyaltyHours: 100,
    discountReason: "Testovaci klubovy hrac pro Sportbar Siruch.",
    seasonSpend: 0,
    seasonReservations: 0,
    adminNote: "Cisty testovaci profil bez stare historie.",
    invitedBy: "",
    level: "nezadano",
    type: "nezadano",
    time: "",
    reservationNeed: "",
    style: "nezadano",
    tournaments: "zadne",
    lastPlayed: "Zatim bez historie v nove testovaci sade.",
    record: "0 zapasu v nove testovaci sade"
  },
  {
    id: "zbyna",
    name: "Zbyna",
    initials: "ZB",
    relation: "club",
    gender: "male",
    accountType: "club",
    accountLabel: "Klubovy hrac",
    age: null,
    credit: 760,
    paidCredit: 760,
    bonusCredit: 0,
    discount: 5,
    baseDiscount: 5,
    loyaltyDiscount: 0,
    playedHours: 14,
    nextLoyaltyHours: 50,
    discountReason: "Testovaci klubovy hrac pro Sportbar Siruch.",
    seasonSpend: 0,
    seasonReservations: 0,
    adminNote: "Cisty testovaci profil bez stare historie.",
    invitedBy: "",
    level: "nezadano",
    type: "nezadano",
    time: "",
    reservationNeed: "",
    style: "nezadano",
    tournaments: "zadne",
    lastPlayed: "Zatim bez historie v nove testovaci sade.",
    record: "0 zapasu v nove testovaci sade"
  },
  {
    id: "handa",
    name: "Handa",
    initials: "HA",
    relation: "club",
    gender: "female",
    accountType: "club",
    accountLabel: "Klubovy hrac",
    age: null,
    credit: 1300,
    paidCredit: 1300,
    bonusCredit: 0,
    discount: 10,
    baseDiscount: 8,
    loyaltyDiscount: 2,
    playedHours: 46,
    nextLoyaltyHours: 50,
    discountReason: "Testovaci klubovy hrac pro Sportbar Siruch.",
    seasonSpend: 0,
    seasonReservations: 0,
    adminNote: "Cisty testovaci profil bez stare historie.",
    invitedBy: "",
    level: "nezadano",
    type: "nezadano",
    time: "",
    reservationNeed: "",
    style: "nezadano",
    tournaments: "zadne",
    lastPlayed: "Zatim bez historie v nove testovaci sade.",
    record: "0 zapasu v nove testovaci sade"
  },
  {
    id: "prema",
    name: "Prema",
    initials: "PR",
    relation: "club",
    gender: "male",
    accountType: "club",
    accountLabel: "Klubovy hrac",
    age: null,
    credit: 700,
    paidCredit: 700,
    bonusCredit: 0,
    discount: 4,
    baseDiscount: 4,
    loyaltyDiscount: 0,
    playedHours: 12,
    nextLoyaltyHours: 50,
    discountReason: "Testovaci klubovy hrac pro Sportbar Siruch.",
    seasonSpend: 0,
    seasonReservations: 0,
    adminNote: "Cisty testovaci profil bez stare historie.",
    invitedBy: "",
    level: "nezadano",
    type: "nezadano",
    time: "",
    reservationNeed: "",
    style: "nezadano",
    tournaments: "zadne",
    lastPlayed: "Zatim bez historie v nove testovaci sade.",
    record: "0 zapasu v nove testovaci sade"
  },
  {
    id: "viki",
    name: "Viki",
    initials: "VI",
    relation: "club",
    gender: "female",
    accountType: "club",
    accountLabel: "Klubovy hrac",
    age: null,
    credit: 1180,
    paidCredit: 1180,
    bonusCredit: 0,
    discount: 9,
    baseDiscount: 8,
    loyaltyDiscount: 1,
    playedHours: 33,
    nextLoyaltyHours: 50,
    discountReason: "Testovaci klubovy hrac pro Sportbar Siruch.",
    seasonSpend: 0,
    seasonReservations: 0,
    adminNote: "Cisty testovaci profil bez stare historie.",
    invitedBy: "",
    level: "nezadano",
    type: "nezadano",
    time: "",
    reservationNeed: "",
    style: "nezadano",
    tournaments: "zadne",
    lastPlayed: "Zatim bez historie v nove testovaci sade.",
    record: "0 zapasu v nove testovaci sade"
  }
];

const guestProfiles = [];

const adminPlayerDirectory = [...players];
adminPlayerDirectory.forEach((player) => {
  player.adminNote = visibleAdminNote(player);
});

let courtPriceRules = [
  { id: "local-price-c1-weekday-morning", court: "c1", days: "Po-Pa", start: "8:00", end: "15:00", price: 160 },
  { id: "local-price-c1-weekday-afternoon", court: "c1", days: "Po-Pa", start: "15:00", end: "21:00", price: 240 },
  { id: "local-price-c1-weekend", court: "c1", days: "So-Ne", start: "8:00", end: "21:00", price: 210 },
  { id: "local-price-c2-weekday-morning", court: "c2", days: "Po-Pa", start: "8:00", end: "16:00", price: 150 },
  { id: "local-price-c2-weekday-afternoon", court: "c2", days: "Po-Pa", start: "16:00", end: "21:00", price: 220 },
  { id: "local-price-c3-all", court: "c3", days: "Po-Ne", start: "8:00", end: "21:00", price: 190 },
  { id: "local-price-c4-weekend", court: "c4", days: "So-Ne", start: "9:00", end: "20:00", price: 230 }
];

const events = [];

const eventThumbnails = [
  { id: "rackets", label: "Testovani raket", image: "assets/club-shop-hero.png" },
  { id: "doubles", label: "Turnaj ctyrher", image: "assets/event-doubles.png" },
  { id: "singles", label: "Turnaj dvouhry", image: "assets/court-top-view.png" },
  { id: "shoes", label: "Kolekce obuvi", image: "assets/event-shoes.png" },
  { id: "shop", label: "Klubovy obchod", image: "assets/club-shop-hero.png" }
];

const tournaments = [];
const reservationSeries = [];

function eventThumbnail(id = "rackets") {
  const known = eventThumbnails.find((item) => item.id === id || item.image === id);
  if (known) return known;
  if (/^(https?:\/\/|assets\/|data:image\/)/i.test(id)) return { id: "custom", label: "Vlastni obrazek", image: id };
  return eventThumbnails[0];
}

const payments = [];
const creditTransactions = [];

const notifications = [];
const friendships = [];
const friendRequests = [];

const gameProposals = [];

const reservationHistory = [];

const motivation = {
  afterWin: "Ted jim to nandame znovu.",
  afterLoss: "Ted jim to natreme.",
  custom: "Hlavne pohoda a dobry prvni servis."
};

const motivationLines = [
  "Dneska hrat chytře, ne silou.",
  "První servis tam a zbytek už půjde.",
  "Minule to bylo těsné, dneska si to vezmeme zpátky.",
  "Klidná hlava, rychlé nohy.",
  "Na síti budeme nepříjemní.",
  "Dneska jim ukážeme, že pátky patří nám.",
  "Hlavně pohoda, ale body zadarmo nedáváme.",
  "Dobrý return rozhodne celý zápas.",
  "Když bude krize, lob na jistotu.",
  "Dneska bez výmluv, kurt je náš."
];

const personalReservations = [
  {
    id: "fri-double-1700",
    isoDate: seedFridayIso,
    day: "Pa",
    date: String(new Date(`${seedFridayIso}T12:00:00`).getDate()),
    start: "17:00",
    end: "19:00",
    kind: "Jednorazova",
    gameType: "double",
    court: courts[0],
    players: ["Radim", "Robin", "Bob", "Honza"],
    attendance: [
      { name: "Radim", initials: "RA", playerId: "radim", gender: "male", status: "active", role: "hraje" },
      { name: "Robin", initials: "RO", playerId: "robin", gender: "male", status: "confirmed", role: "potvrdil" },
      { name: "Bob", initials: "BO", playerId: "bob", gender: "male", status: "confirmed", role: "potvrdil" },
      { name: "Honza", initials: "HO", playerId: "honza", gender: "male", status: "confirmed", role: "potvrdil" }
    ]
  }
];

const adminStats = [
  { value: "76 %", label: "Vytizeni dnes", tone: "good" },
  { value: "8", label: "Rezervaci do vecera", tone: "neutral" },
  { value: "3", label: "Rezervace cekaji na hrace", tone: "warn" },
  { value: "92 %", label: "Strzeno z kreditu", tone: "good" }
];

const adminTasks = [
  { title: "Doplnit volne spicky", meta: "Dnes 18:30-20:00, poslat cilene last minute pozvanky", action: "admin-invite" },
  { title: "Rezervace bez kompletni sestavy", meta: "Zkontrolovat casy, kde system nabizi vhodne spoluhrace", action: "admin-reservation" },
  { title: "Cenik mimo spicku", meta: "Zkontrolovat, jestli se vyplati spustit levnejsi dopoledni useky", action: "admin-court" }
];

const adminReservations = [
  { reservationId: "fri-double-1700", time: "Pa 17:00-19:00", court: "Kurt 1", surface: "Antuka", owner: "Radim", status: "Plna sestava", players: "4/4", tone: "good" }
];

const adminPayments = [];

const courtUtilization = [
  { court: "Kurt 1", surface: "Antuka", utilization: 84, free: "20:30-22:00", revenue: 2840, tone: "good" },
  { court: "Kurt 2", surface: "Umele", utilization: 61, free: "14:00-16:30", revenue: 1760, tone: "warn" },
  { court: "Kurt 3", surface: "Trava", utilization: 48, free: "11:00-15:00", revenue: 1320, tone: "low" },
  { court: "Kurt 4", surface: "Antuka", utilization: 69, free: "18:30-20:00", revenue: 1980, tone: "warn" }
];

const lastMinuteSuggestions = [];

const creditBonusRules = [
  { id: "credit-rule-3000", name: "Dobiti 3 000 Kc", paid: 3000, bonus: 100, note: "bonusovy kredit, cena kurtu zustava podle sazby a slevy hrace" },
  { id: "credit-rule-5000", name: "Dobiti 5 000 Kc", paid: 5000, bonus: 220, note: "vetsi bonus pro caste hrace, evidovat oddelene od zaplacene castky" },
  { id: "credit-rule-10000", name: "Dobiti 10 000 Kc", paid: 10000, bonus: 550, note: "klub muze zapnout jen vybranym typum hracu" }
];

const loyaltyTiers = [
  { hours: 25, bonus: 1, label: "Rozhrany hrac" },
  { hours: 50, bonus: 2, label: "Staly hrac" },
  { hours: 100, bonus: 5, label: "Vazeny hrac" },
  { hours: 180, bonus: 8, label: "Ambasador klubu" }
];

const courtBusinessStats = [
  { court: "Kurt 1", max: 79200, current: 64240, lastMonth: 58600, trend: "+9.6 %", popularity: "nejoblibenejsi", series: [42, 48, 54, 59, 64] },
  { court: "Kurt 2", max: 72600, current: 48210, lastMonth: 45100, trend: "+6.9 %", popularity: "stred", series: [36, 39, 41, 45, 48] },
  { court: "Kurt 3", max: 68400, current: 32680, lastMonth: 38400, trend: "-14.9 %", popularity: "nejmene oblibeny", series: [39, 37, 34, 31, 33] },
  { court: "Kurt 4", max: 74800, current: 51790, lastMonth: 49800, trend: "+4.0 %", popularity: "roste", series: [44, 46, 49, 50, 52] }
];

const monthlyRevenue = [
  { month: "Leden", value: 142800 },
  { month: "Unor", value: 158400 },
  { month: "Brezen", value: 181200 },
  { month: "Duben", value: 196900 },
  { month: "Kveten", value: 214500 },
  { month: "Cerven", value: 196920 }
];

const salesCampaigns = [
  {
    title: "Turnaj + test raket a bot",
    date: "So 22. 6.",
    weather: "slunecno 24 C",
    occupancy: "kurty 92 % obsazene",
    partner: "eshop doda demo sadu na klub",
    revenue: "klub 8 %, platforma 5 %",
    status: "pripravit anketu"
  },
  {
    title: "Vypletaci den",
    date: "Ct 27. 6.",
    weather: "vecerni liga",
    occupancy: "18 rezervaci v tydnu",
    partner: "vyplety + servis na miste",
    revenue: "klub servis, platforma provize",
    status: "oslovit stale hrace"
  }
];

const productPollItems = [];

const clubPolls = [];

const clubShopItems = [
  { title: "Mice na pristi hru", type: "rychly nakup", price: "od 169 Kc", delivery: "vyzvednuti na baru", note: "nejlevnejsi stale zbozi pro klub" },
  { title: "Vyplet rakety", type: "sluzba", price: "od 390 Kc", delivery: "odevzdat pri rezervaci", note: "navazat na hrace a historii vypletu" },
  { title: "Boty k vyzkouseni", type: "demo objednavka", price: "club deal", delivery: "do nejblizsi akce nebo na klub", note: "velikosti podle profilu hrace" },
  { title: "Raketa na test", type: "testovaci kus", price: "zalohou z kreditu", delivery: "test pri rezervaci", note: "vratka po hre, koupe se zlevou" }
];

const playerOrders = [];

const stringingOrders = [];

const productNudges = [
  { trigger: "pred rezervaci", message: "Mas vypleteno? Chces raketu odevzdat pred hrou a mit ji hotovou na dalsi rezervaci?" },
  { trigger: "po rezervaci", message: "Boty a ponozky v poradku? Pri dalsi hre ti muzeme pripravit klubovy vyber k vyzkouseni." },
  { trigger: "30 dni od vypletu", message: "Hrajes casto. Nechces preplest raketu pred dalsi rezervaci nebo ji po hre nechat u vypletace?" },
  { trigger: "dochazi spotrebni zbozi", message: "Tenisaky, ponozky a gripy muzeme pridat do kluboveho baliku za lepsi cenu." }
];

const servicePartners = [
  { role: "Spravce", name: "Klub Sportbar Siruch", status: "prevezme na baru" },
  { role: "Vypletac", name: "Jan Vypleta Servis", status: "prijede pro rakety 2x tydne" },
  { role: "Obchod", name: "Partner tenis vybaveni", status: "dodava klubove baliky" }
];

const specialOccupancyTypes = [
  { type: "turnaj", label: "Turnaj", color: "#7c4dff", note: "blokuje vice kurtu a vytvari registraci" },
  { type: "demo", label: "Testovani raket", color: "#e88b2c", note: "obsazenost s obchodni akci a produkty" },
  { type: "training", label: "Trening", color: "#2d79c7", note: "trener, kapacita hracu, cena lekce" },
  { type: "service", label: "Vypletani", color: "#1f684e", note: "servisni okno bez bezne rezervace" }
];

const habitAlerts = [];

const content = document.querySelector("#appContent");
const modalBackdrop = document.querySelector("#modalBackdrop");
const modalContent = document.querySelector("#modalContent");
const modalClose = document.querySelector("#modalClose");
const toast = document.querySelector("#toast");
const helpCoachmark = document.querySelector("#helpCoachmark");
const STORAGE_KEY = "tennis-club-portal-state-v1";
const DATA_SCHEMA_VERSION = 124;
const DEFAULT_PUBLIC_API = "https://sportbar-siruch-api.bacik.workers.dev";
const API_STORAGE_KEY = "tennis-club-api-base";
const urlApiBase = new URLSearchParams(window.location.search).get("api") || "";
let storedApiBase = "";
try {
  storedApiBase = localStorage.getItem(API_STORAGE_KEY) || "";
  if (urlApiBase) localStorage.setItem(API_STORAGE_KEY, urlApiBase);
} catch (_) {}
const localApiBase = isLocalTestingHost(window.location.hostname) ? window.location.origin : "";
const pagesApiBase = window.location.hostname.endsWith(".pages.dev") ? window.location.origin : "";
const publicApiBase = isLocalTestingHost(window.location.hostname) ? "" : DEFAULT_PUBLIC_API;
const API_BASE = urlApiBase || localApiBase || storedApiBase || pagesApiBase || publicApiBase;
const PLATFORM_API_BASE = (new URLSearchParams(window.location.search).get("platformApi") || pagesApiBase).replace(/\/$/, "");
const platformContext = {
  enabled: Boolean(PLATFORM_API_BASE),
  clubId: "",
  membershipId: "",
  userId: "",
  email: "",
  role: "",
  membersByPersona: new Map(),
  loadedDates: new Set(),
  clubs: []
};
let platformAgenda = { reservations: [], events: [] };
let platformAnalytics = null;
let platformCharges = [];
let platformPrivacy = { policyVersion: "2026-08-01", preferences: [], requests: [] };
let platformNotificationPreferences = {};
let platformConnections = { profile: {}, connections: [], notifications: [] };
let platformModules = [];
const SELECTED_CLUB_KEY = "tennis-platform-selected-club";
const LOGIN_SESSION_KEY = "tennis-club-login-session";
let sharedApiOnline = false;
let suppressRemotePersist = false;
let loginPromptShown = false;
let remoteUpdatedAt = "";
let lastRemoteState = null;
let lastLocalPersistAt = 0;
let syncTimer = null;
let platformSyncTimer = null;
let platformSyncInFlight = false;
let lastActionMessage = "";
let remoteSaveQueue = Promise.resolve();
let remoteSavesPending = 0;
let stateRevisionAt = "";

function isLocalTestingHost(hostname = "") {
  return ["localhost", "127.0.0.1", "::1", ""].includes(hostname);
}

function isLocalTestingMode() {
  return isLocalTestingHost(window.location.hostname);
}

function savedLoginSession() {
  try {
    return JSON.parse(localStorage.getItem(LOGIN_SESSION_KEY) || "null");
  } catch (_) {
    return null;
  }
}

function applyLoginSession() {
  const session = savedLoginSession();
  const account = session?.email ? accountByEmail(session.email) : null;
  if (account && account.role === session.role) {
    state.role = account.role;
    state.view = "home";
    if (account.persona) setCurrentPersona(account.persona);
    return true;
  }

  if (!isLocalTestingMode()) {
    state.role = "guest";
    state.view = "home";
  }
  return false;
}

function saveLoginSession(account) {
  try {
    localStorage.setItem(LOGIN_SESSION_KEY, JSON.stringify({
      email: account.email,
      role: account.role,
      persona: account.persona || "",
      loggedAt: Date.now()
    }));
  } catch (_) {}
}

function updateRoleSwitcherVisibility() {
  const roleSwitch = document.querySelector(".role-switch-bar");
  if (roleSwitch) roleSwitch.hidden = !isLocalTestingMode() || platformContext.enabled;
}

async function platformRequest(path, options = {}) {
  if (!platformContext.enabled) throw new Error("Platform API is not configured.");
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${PLATFORM_API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || "Server pozadavek odmitl.");
    error.code = body?.error?.code || "request_failed";
    error.status = response.status;
    throw error;
  }
  return body;
}

function platformRole(role = "player") {
  if (["admin", "manager"].includes(role)) return "admin";
  if (role === "stringer") return "stringer";
  if (role === "seller") return "seller";
  return "player";
}

function isPrimaryClubAdmin() {
  return state.role === "admin" && (!platformContext.enabled || platformContext.role === "admin");
}

function adminHeaderLabel() {
  return isPrimaryClubAdmin() ? "Hlavni spravce" : "Spravce klubu";
}

function versionedAssetUrl(url = "") {
  return url;
}

function applyPlatformWallet(wallet, playerId = currentPersonaId()) {
  const player = playerRecordById(playerId);
  if (!player || !wallet?.balance) return;
  player.paidCredit = Number(wallet.balance.paidMinor || 0) / 100;
  player.bonusCredit = Number(wallet.balance.bonusMinor || 0) / 100;
  player.credit = Number(wallet.balance.totalMinor || 0) / 100;
  if (playerId === currentPersonaId()) setCurrentPersona(playerId);

  const imported = (wallet.history || []).map((item) => ({
    id: item.id,
    playerId,
    type: item.transaction_type,
    paid: Number(item.paid_delta_minor || 0) / 100,
    bonus: Number(item.bonus_delta_minor || 0) / 100,
    total: (Number(item.paid_delta_minor || 0) + Number(item.bonus_delta_minor || 0)) / 100,
    balanceAfter: (Number(item.paid_balance_after_minor || 0) + Number(item.bonus_balance_after_minor || 0)) / 100,
    method: item.payment_method || "other",
    note: item.note || "",
    createdBy: "Spravce",
    createdAt: item.created_at
  }));
  creditTransactions.splice(0, creditTransactions.length,
    ...creditTransactions.filter((item) => item.playerId !== playerId),
    ...imported
  );
}

function platformPersonaByMembership(membershipId = "") {
  for (const [personaId, memberId] of platformContext.membersByPersona.entries()) {
    if (memberId === membershipId) return personaId;
  }
  return "";
}

function platformSurface(surface = "other") {
  if (surface === "clay") return "Antuka";
  if (surface === "grass") return "Trava";
  if (surface === "hard") return "Umele";
  if (surface === "carpet") return "Koberec";
  return "Jiny";
}

function platformSurfaceCode(surface = "Jiny") {
  if (surface === "Antuka") return "clay";
  if (surface === "Trava") return "grass";
  if (surface === "Umele") return "hard";
  if (surface === "Koberec") return "carpet";
  return "other";
}

function platformPriceDayLabel(dayKey = "all") {
  if (dayKey === "weekdays") return "Po-Pa";
  if (dayKey === "weekend") return "So-Ne";
  if (dayKey.startsWith("date:")) return "Dnes";
  return "Po-Ne";
}

function platformPriceDayKey(label = "Po-Ne") {
  if (label === "Po-Pa") return "weekdays";
  if (label === "So-Ne") return "weekend";
  if (label === "Dnes") return `date:${selectedBookingIsoDate()}`;
  return "all";
}

function ensurePlatformDirectoryPlayer(member) {
  let player = adminPlayerDirectory.find((item) => item.name.toLowerCase() === member.displayName.toLowerCase());
  if (!player) {
    player = {
      id: slugifyPlayerId(member.displayName),
      name: member.displayName,
      initials: initialsFromName(member.displayName),
      relation: "club",
      gender: "male",
      email: member.email || "",
      accountType: member.accountType || "club",
      accountLabel: member.accountType === "guest" ? "Host" : member.accountType === "credit" ? "Kreditovy hrac" : "Klubovy hrac",
      age: null,
      credit: 0,
      paidCredit: 0,
      bonusCredit: 0,
      discount: 0,
      baseDiscount: 0,
      loyaltyDiscount: 0,
      playedHours: 0,
      nextLoyaltyHours: 50,
      discountReason: "",
      seasonSpend: 0,
      seasonReservations: 0,
      adminNote: "",
      invitedBy: "",
      level: "nezadano",
      type: "nezadano",
      time: "",
      reservationNeed: "",
      style: "nezadano",
      tournaments: "zadne",
      lastPlayed: "Zatim bez historie.",
      record: "0 zapasu"
    };
    adminPlayerDirectory.push(player);
    players.push(player);
  }
  if (member.email) player.email = member.email;
  player.clubRole = member.role || "player";
  if (member.accountType) {
    player.accountType = member.accountType;
    player.accountLabel = member.accountType === "guest" ? "Host" : member.accountType === "credit" ? "Kreditovy hrac" : "Klubovy hrac";
  }
  if (Number.isFinite(member.baseDiscountPct)) player.baseDiscount = Number(member.baseDiscountPct);
  if (Number.isFinite(member.loyaltyDiscountPct)) player.loyaltyDiscount = Number(member.loyaltyDiscountPct);
  player.discount = Number(player.baseDiscount || 0) + Number(player.loyaltyDiscount || 0);
  if (member.discountReason) player.discountReason = member.discountReason;
  if (member.adminNote) player.adminNote = member.adminNote;
  return player;
}

function platformAttendance(participant) {
  const playerId = platformPersonaByMembership(participant.membershipId) || playerIdByDisplayName(participant.displayName);
  const record = playerRecordById(playerId);
  const status = participant.status === "owner" ? "active" : participant.status;
  const roles = {
    owner: "vytvoril rezervaci",
    pending: "ceka na potvrzeni",
    confirmed: "potvrdil",
    replacement: "potvrzeny nahradnik",
    declined: "odmitl"
  };
  return {
    name: participant.displayName,
    initials: record?.initials || participant.displayName.slice(0, 2).toUpperCase(),
    playerId,
    gender: record?.gender || (["handa", "viki"].includes(playerId) ? "female" : "male"),
    status,
    role: roles[participant.status] || participant.status
  };
}

async function refreshPlatformReservations(daysAhead = 14) {
  if (!platformContext.enabled || !platformContext.clubId) return false;
  const dates = Array.from({ length: daysAhead }, (_, index) => {
    const date = new Date(appToday);
    date.setDate(date.getDate() + index);
    return dateToIso(date);
  });
  const [mine, notices, schedule] = await Promise.all([
    platformRequest(`/api/v2/clubs/${platformContext.clubId}/me/reservations`),
    platformRequest(`/api/v2/clubs/${platformContext.clubId}/me/notifications`),
    platformRequest(`/api/v2/clubs/${platformContext.clubId}/schedule?from=${dates[0]}&days=${daysAhead}`)
  ]);

  const mappedCourts = (schedule.courts || []).map((item) => ({
    id: item.id,
    name: item.name,
    surface: platformSurface(item.surface),
    surfaceClass: courtSurfaceClass(platformSurface(item.surface)),
    color: item.color,
    photo: item.photoUrl || courtPhoto,
    openTime: item.openTime,
    closeTime: item.closeTime,
    reservations: []
  }));
  replaceArray(courts, mappedCourts);
  replaceArray(courtPriceRules, (schedule.priceRules || []).map((rule) => ({
    id: rule.id,
    court: rule.courtId,
    days: platformPriceDayLabel(rule.dayKey),
    dayKey: rule.dayKey,
    start: rule.start,
    end: rule.end,
    price: Number(rule.priceMinor || 0) / 100
  })));
  if (mappedCourts[0]) {
    club.open = mappedCourts[0].openTime || club.open;
    club.close = mappedCourts[0].closeTime || club.close;
  }

  const mappedMine = (mine.reservations || []).map((item) => {
    const date = dateFromIso(item.date) || appToday;
    const court = courts.find((entry) => entry.id === item.courtId) || courts[0];
    const attendance = (item.participants || []).map(platformAttendance);
    return {
      id: item.id,
      eventType: item.eventType,
      isoDate: item.date,
      day: weekdayCodes[date.getDay()],
      date: String(date.getDate()),
      start: item.start,
      end: item.end,
      kind: item.seriesId ? "Trvala" : "Jednorazova",
      seriesId: item.seriesId || "",
      gameType: item.gameType,
      status: item.status,
      title: item.title || "",
      ownerMembershipId: item.ownerMembershipId,
      participantStatus: item.participantStatus,
      createdAt: item.createdAt,
      canEditParticipants: item.canEditParticipants,
      canCancel: item.canCancel,
      canCancelUntil: item.canCancelUntil,
      court,
      players: attendance.map((player) => player.name),
      attendance
    };
  });
  if (Number.isInteger(Number(mine.cancellationMinutes))) club.cancellationMinutes = Number(mine.cancellationMinutes);
  replaceArray(personalReservations, mappedMine.filter((item) => !(item.title === "Navrh hry" && item.status === "pending")));
  replaceArray(gameProposals, (mine.reservations || []).filter((item) => item.title === "Navrh hry" && item.status === "pending").map((item) => {
    const date = dateFromIso(item.date) || appToday;
    const ownerId = platformPersonaByMembership(item.ownerMembershipId);
    const sentTo = (item.participants || []).filter((participant) => participant.membershipId !== item.ownerMembershipId).map((participant) => {
      const playerId = platformPersonaByMembership(participant.membershipId);
      const player = playerRecordById(playerId);
      return {
        name: participant.displayName,
        initials: player?.initials || participant.displayName.slice(0, 2).toUpperCase(),
        playerId,
        status: participant.status
      };
    });
    const confirmed = 1 + sentTo.filter((player) => ["confirmed", "replacement"].includes(player.status)).length;
    const target = item.gameType === "single" ? 2 : 4;
    return {
      id: item.id,
      ownerId,
      gameType: item.gameType,
      isoDate: item.date,
      title: `${formatPortalDate(date)} ${item.start}-${item.end}`,
      court: `${courts.find((court) => court.id === item.courtId)?.name || item.courtName} · ${platformSurface(item.surface)}`,
      sentTo,
      state: confirmed >= target ? "Sestava potvrzena" : `Potvrzeno ${confirmed}/${target}`,
      note: item.gameType === "single" ? "Single potrebuje 2 hrace." : "Double potrebuje 4 hrace."
    };
  }));

  const allDailyReservations = [];
  (schedule.courts || []).forEach((dayCourt) => {
      const court = courts.find((item) => item.id === dayCourt.id);
      if (!court) return;
      (dayCourt.reservations || []).forEach((reservation) => {
        const linked = personalReservations.find((item) => item.id === reservation.id);
        const type = reservation.kind === "block"
          ? "special"
          : reservation.invitationPending || (reservation.isMine && reservation.status === "pending")
          ? "pending"
          : reservation.isMine
            ? "mine"
            : reservation.status === "searching"
              ? "group"
              : "busy";
        court.reservations.push({
          isoDate: reservation.date,
          start: reservation.start,
          end: reservation.end,
          title: reservation.kind === "block" ? reservation.title : reservation.status === "searching" ? "Hleda spoluhrace" : reservation.gameType === "single" ? "Dvouhra" : "Ctyrhra",
          type,
          specialType: reservation.blockType,
          note: reservation.note,
          color: reservation.color,
          reservationId: reservation.id,
          players: linked?.players || []
        });
        allDailyReservations.push({ ...reservation, court: dayCourt });
      });
  });
  courts.forEach((court) => court.reservations.sort((left, right) => String(left.isoDate).localeCompare(String(right.isoDate)) || timeToMinutes(left.start) - timeToMinutes(right.start)));
  replaceArray(adminReservations, allDailyReservations.map((item) => ({
    time: `${formatPortalDate(dateFromIso(item.date))} ${item.start}-${item.end}`,
    court: item.court.name,
    surface: platformSurface(item.court.surface),
    owner: item.kind === "block" ? item.title : item.ownerName || "Clen klubu",
    status: item.kind === "block" ? "Specialni blokace" : item.status === "confirmed" ? "Potvrzeno" : item.status === "searching" ? "Hleda hrace" : "Ceka na potvrzeni",
    players: item.kind === "block" ? item.blockType : `${item.activePlayers}/${item.targetPlayers}`,
    tone: item.kind === "block" ? "info" : item.status === "confirmed" ? "good" : "warn",
    kind: item.kind || "reservation",
    reservationId: item.id
  })));

  replaceArray(notifications, (notices.notifications || []).map((item) => ({
    id: item.id,
    serverNotificationId: item.id,
    type: item.type === "reservation_invite" ? "booking-invite" : item.type === "replacement_invite" ? "replacement-invite" : item.type === "replacement_vote" ? "replacement-vote" : item.type === "game_counterproposal" ? "counterproposal" : ["poll_opened", "poll_reminder"].includes(item.type) ? "poll" : item.type === "tournament_opened" ? "event-announcement" : item.type === "credit_topup" ? "credit" : item.type === "event_announcement" ? "event-announcement" : item.type === "event_cancelled" ? "event-cancelled" : item.type === "friend_request" ? "friend-request" : item.type === "friend_accepted" ? "friend-accepted" : item.type === "order_ready" ? "order-ready" : item.type,
    recipients: [currentPersonaId()],
    title: item.title,
    meta: item.body,
    status: item.type === "reservation_invite" ? "Ceka na potvrzeni" : "Nove",
    reservationId: item.entity_type === "reservation" ? item.entity_id : undefined,
    candidateMembershipId: item.type === "replacement_vote" ? item.actor_membership_id : undefined,
    eventId: item.entity_type === "event" ? item.entity_id : undefined,
    friendRequestId: item.entity_type === "friend_request" ? item.entity_id : undefined,
    orderId: item.entity_type === "order" ? item.entity_id : undefined,
    counterproposalId: item.entity_type === "counterproposal" ? item.entity_id : undefined,
    pollId: item.entity_type === "poll" ? item.entity_id : undefined,
    tournamentId: item.entity_type === "tournament" ? item.entity_id : undefined,
    requestFrom: item.entity_type === "friend_request" ? platformPersonaByMembership(item.actor_membership_id) : undefined,
    createdAt: item.created_at
  })));
  platformContext.loadedDates = new Set(dates);
  return true;
}

function applyPlatformEvents(payload) {
  const mapped = (payload?.events || []).map((item) => {
    const date = dateFromIso(item.date) || appToday;
    const thumbnail = item.imageUrl || (item.eventType === "tournament" ? "singles" : item.eventType === "demo" ? "rackets" : "shop");
    return {
      id: item.id,
      isoDate: item.date,
      startTime: item.start,
      endTime: item.end,
      thumbnail,
      status: item.status,
      date: weekdayCodes[date.getDay()] || "Akce",
      title: item.title,
      meta: `${formatPortalDate(date)} ${item.start}-${item.end}`,
      detail: item.detail,
      fee: item.feeLabel,
      capacity: item.capacity,
      registered: (item.registrations || []).map((registration) => registration.displayName),
      history: "",
      cancelReason: item.cancellationReason || "",
      isRegistered: Boolean(item.isRegistered)
    };
  });
  replaceArray(events, mapped);
  const playerId = currentPersonaId();
  state.joinedEventsByPlayer[playerId] = mapped.filter((event) => event.isRegistered).map((event) => event.id);
  state.joinedEvents = new Set(state.joinedEventsByPlayer[playerId]);
}

async function refreshPlatformEvents() {
  if (!platformContext.enabled || !platformContext.clubId) return false;
  applyPlatformEvents(await platformRequest(`/api/v2/clubs/${platformContext.clubId}/events`));
  return true;
}

function applyPlatformRelationships(payload) {
  replaceArray(friendships, (payload?.friendships || []).map((item) => ({
    id: item.id,
    players: (item.membershipIds || []).map(platformPersonaByMembership).filter(Boolean),
    createdAt: item.createdAt
  })).filter((item) => item.players.length === 2));
  replaceArray(friendRequests, (payload?.requests || []).map((item) => ({
    id: item.id,
    from: platformPersonaByMembership(item.requesterMembershipId),
    to: platformPersonaByMembership(item.recipientMembershipId),
    status: item.status,
    createdAt: item.createdAt
  })).filter((item) => item.from && item.to));
}

async function refreshPlatformRelationships() {
  if (!platformContext.enabled || !platformContext.clubId) return false;
  applyPlatformRelationships(await platformRequest(`/api/v2/clubs/${platformContext.clubId}/relationships`));
  return true;
}

function platformOrderStatus(status = "new") {
  return ({
    new: "nova objednavka",
    checking: "overit dostupnost",
    ordered: "objednano u dodavatele",
    preparing: "pripravuje se na klubu",
    ready: "vyrizena spravcem - pripravena",
    completed: "predano hraci",
    cancelled: "zruseno"
  })[status] || status;
}

function applyPlatformOrders(payload) {
  replaceArray(playerOrders, (payload?.orders || []).map((item) => {
    const playerId = platformPersonaByMembership(item.membershipId);
    const reservation = item.reservationDate ? `${formatPortalDate(dateFromIso(item.reservationDate))} ${item.reservationStart || ""}` : "";
    return {
      id: item.id,
      player: item.displayName,
      playerId,
      product: item.productName,
      type: item.productType === "service" ? "sluzba" : item.productType === "demo" ? "demo" : "zbozi",
      status: platformOrderStatus(item.status),
      serverStatus: item.status,
      reservation: item.deliveryMode === "reservation" ? reservation : item.deliveryMode === "event" ? item.eventTitle : item.pickupDate,
      reservationId: item.reservationId,
      deliveryMode: item.deliveryMode,
      pickupDate: item.pickupDate || "",
      eventId: item.eventId || "",
      eventTitle: item.eventTitle || "",
      source: item.source,
      sourceLabel: item.source === "stock" ? "ze skladu klubu" : item.source === "supplier" ? "objednat od dodavatele" : item.source === "check" ? "overit dostupnost" : "spravce jeste nerozhodl",
      batch: item.deliveryMode === "reservation" ? "nachystat k rezervaci" : item.deliveryMode === "event" ? "pridat do akce / demo baliku" : "nachystat na klub",
      value: Number(item.amountMinor || 0) / 100,
      note: item.note || "bez poznamky"
    };
  }));
}

async function refreshPlatformOrders() {
  if (!platformContext.enabled || !platformContext.clubId) return false;
  const endpoint = state.role === "player" ? "me/orders" : "orders";
  applyPlatformOrders(await platformRequest(`/api/v2/clubs/${platformContext.clubId}/${endpoint}`));
  return true;
}

const stringingStatusLabels = {
  waiting_dropoff: "ceka na predani rakety klubu",
  at_club: "raketa je prijata na klubu",
  with_stringer: "raketa je u vypletace",
  returned_to_club: "vypletac vratil raketu klubu",
  ready_for_pickup: "pripravena na recepci",
  delivered: "predana hraci klubem",
  cancelled: "zruseno"
};

function applyPlatformStringing(payload) {
  replaceArray(stringingOrders, (payload?.jobs || []).map((item) => {
    const reservation = item.reservationDate
      ? `${formatPortalDate(dateFromIso(item.reservationDate))}${item.reservationStart ? ` v ${item.reservationStart}` : ""}`
      : "pred pristi hrou";
    return {
      id: item.id,
      orderId: item.orderId,
      player: item.playerName,
      playerId: platformPersonaByMembership(item.playerMembershipId),
      racket: item.racketLabel,
      string: item.stringName,
      tension: item.tension,
      status: item.status,
      statusLabel: stringingStatusLabels[item.status] || item.status,
      reservation,
      reservationId: item.reservationId,
      handoff: item.status === "with_stringer" ? "u vypletace" : item.status === "delivered" ? "predano hraci" : "pres recepci klubu",
      due: reservation,
      note: item.staffNote || item.playerNote || "bez poznamky",
      message: item.status === "ready_for_pickup" ? stringingReadyMessage({ reservation }) : ""
    };
  }));
}

async function refreshPlatformStringing() {
  if (!platformContext.enabled || !platformContext.clubId) return false;
  const endpoint = state.role === "player" ? "me/stringing-jobs" : "stringing-jobs";
  applyPlatformStringing(await platformRequest(`/api/v2/clubs/${platformContext.clubId}/${endpoint}`));
  return true;
}

function applyPlatformPolls(payload) {
  replaceArray(clubPolls, (payload?.polls || []).map((poll) => ({
    id: poll.id,
    title: poll.title,
    question: poll.question,
    status: poll.status,
    start: "klubova anketa",
    end: formatPortalDate(dateFromIso(poll.endsAt), false),
    endsAt: poll.endsAt,
    reminder: "Pripominka prijde pouze hracum, kteri jeste nehlasovali.",
    supplierNote: "Po uzavreni spravce pripravi navazujici akci pro obchodnika.",
    cadence: "Vysledek zustava spravci jako podklad pro akci.",
    options: (poll.options || []).map((option) => ({
      id: option.id,
      label: option.label,
      category: option.category === "shoes" ? "boty" : option.category === "clothing" ? "obleceni" : option.category === "rackets" ? "rakety" : "ostatni",
      votes: Array.from({ length: Number(option.voteCount || 0) }, (_, index) => poll.myOptionId === option.id && index === 0 ? currentPersonaId() : `hlas-${poll.id}-${option.id}-${index}`),
      weighted: Number(option.weighted || 0),
      logistics: option.logisticsNote
    }))
  })));
}

async function refreshPlatformPolls() {
  if (!platformContext.enabled || !platformContext.clubId) return false;
  applyPlatformPolls(await platformRequest(`/api/v2/clubs/${platformContext.clubId}/polls`));
  return true;
}

function applyPlatformTournaments(payload) {
  const mapped = (payload?.tournaments || []).map((item) => {
    const matches = (item.matches || []).map((match) => ({
      id: match.id,
      stage: match.stage,
      group: match.group || "",
      court: match.court || "bez kurtu",
      time: match.start || "",
      playerA: match.playerA || "volny los",
      playerB: match.playerB || "volny los",
      playerAMembershipId: match.playerAMembershipId,
      playerBMembershipId: match.playerBMembershipId,
      winnerMembershipId: match.winnerMembershipId,
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      winnerTeamId: match.winnerTeamId,
      winner: match.winner || "",
      score: match.score || ""
    }));
    const groups = (item.groups || []).map((group) => ({
      name: group.name,
      players: item.type === "double" ? (group.teams || []).map((team) => team.name) : (group.players || []).map((player) => player.displayName),
      table: (item.type === "double" ? (group.teams || []).map((team) => ({ membershipId: team.id, displayName: team.name, team: true })) : (group.players || [])).map((player) => {
        const played = matches.filter((match) => match.group === group.name && [match.playerA, match.playerB].includes(player.displayName) && match.score);
        const wins = played.filter((match) => player.team ? match.winnerTeamId === player.membershipId : match.winnerMembershipId === player.membershipId).length;
        return { player: player.displayName, points: wins * 2, wins, losses: played.length - wins, score: `${wins}:${played.length - wins}` };
      }).sort((left, right) => right.points - left.points || right.wins - left.wins)
    }));
    return {
      id: item.id,
      title: item.title,
      type: item.type,
      status: item.status,
      date: `${formatPortalDate(dateFromIso(item.date))} ${item.start}`,
      isoDate: item.date,
      startTime: item.start,
      deadline: `${formatPortalDate(dateFromIso(item.deadline?.slice(0, 10)))} ${item.deadline?.slice(11) || ""}`,
      deadlineIso: item.deadline,
      courts: (item.courtIds || []).map((id) => courts.find((court) => court.id === id)?.name || id),
      courtIds: item.courtIds || [],
      maxPlayers: Number(item.maxParticipants || 16),
      entryFee: item.entryFeeLabel,
      rules: item.rules,
      participants: (item.participants || []).map((participant) => participant.displayName),
      participantRows: item.participants || [],
      teams: item.teams || [],
      isRegistered: Boolean(item.isRegistered),
      groups,
      matches,
      knockout: matches.filter((match) => match.stage !== "group"),
      history: item.status === "completed" ? `Archiv: ${item.title}, ${item.participants?.length || 0} hracu.` : ""
    };
  });
  replaceArray(tournaments, mapped);
}

async function refreshPlatformTournaments() {
  if (!platformContext.enabled || !platformContext.clubId) return false;
  applyPlatformTournaments(await platformRequest(`/api/v2/clubs/${platformContext.clubId}/tournaments`));
  return true;
}

function applyPlatformSupplierRequests(payload) {
  (payload?.requests || []).forEach((request) => {
    let event = events.find((item) => item.id === request.eventId);
    if (!event) {
      event = {
        id: request.eventId,
        isoDate: request.date,
        startTime: request.start,
        endTime: request.end,
        thumbnail: request.imageUrl || "rackets",
        date: weekdayCodes[(dateFromIso(request.date) || appToday).getDay()] || "Akce",
        title: request.title,
        meta: `${formatPortalDate(dateFromIso(request.date))} ${request.start}-${request.end}`,
        detail: request.detail,
        fee: request.feeLabel,
        registered: [],
        history: `Vysledek ankety: ${request.winningOption || request.requestedItems}.`
      };
      events.unshift(event);
    }
    event.sourcePollId = request.pollId;
    event.supplierRequestId = request.id;
    event.requestedDate = `${formatPortalDate(dateFromIso(request.date))} ${request.start}-${request.end}`;
    event.sellerDelivery = request.sellerItems || "";
    event.sellerNote = request.sellerNote || "";
    event.sellerStatus = request.status === "confirmed" ? "obchodnik potvrdil termin a dodavku" : request.status === "published" ? "publikovano hracum" : request.status === "declined" ? "obchodnik termin odmitl" : "ceka na potvrzeni obchodnika";
    event.status = request.status === "confirmed" ? "seller_confirmed" : request.status === "published" ? "published" : request.status === "declined" ? "seller_counterproposal" : "waiting_for_seller";
  });
}

async function refreshPlatformSupplierRequests() {
  if (!platformContext.enabled || !platformContext.clubId || !["admin", "seller"].includes(state.role)) return false;
  applyPlatformSupplierRequests(await platformRequest(`/api/v2/clubs/${platformContext.clubId}/supplier-requests`));
  return true;
}

function applyPlatformReservationSeries(payload) {
  replaceArray(reservationSeries, (payload?.series || []).map((item) => ({
    id: item.id,
    courtId: item.courtId,
    courtName: item.courtName,
    ownerMembershipId: item.ownerMembershipId,
    ownerName: item.ownerName,
    startDate: item.startDate,
    endDate: item.endDate,
    start: item.start,
    end: item.end,
    gameType: item.gameType,
    title: item.title || "Trvala rezervace",
    status: item.status,
    occurrenceCount: Number(item.occurrenceCount || 0)
  })));
}

async function refreshPlatformReservationSeries() {
  if (!platformContext.enabled || !platformContext.clubId || state.role !== "admin") return false;
  applyPlatformReservationSeries(await platformRequest(`/api/v2/clubs/${platformContext.clubId}/reservation-series`));
  return true;
}

async function loadPlatformContext() {
  const [me, memberships] = await Promise.all([
    platformRequest("/api/v2/me"),
    platformRequest("/api/v2/me/clubs")
  ]);
  platformContext.clubs = memberships.clubs || [];
  let selectedClubId = "";
  try { selectedClubId = localStorage.getItem(SELECTED_CLUB_KEY) || ""; } catch (_) {}
  const membership = platformContext.clubs.find((item) => item.clubId === selectedClubId) || platformContext.clubs[0];
  if (!membership) throw new Error("Ucet nema pristup k zadnemu klubu.");

  platformContext.clubId = membership.clubId;
  platformContext.membershipId = membership.membershipId;
  platformContext.userId = me.user.id;
  platformContext.email = me.user.email;
  platformContext.role = membership.role;
  state.role = platformRole(membership.role);
  state.view = "home";

  const account = accountByEmail(me.user.email);
  if (account?.persona) setCurrentPersona(account.persona);
  else {
    const player = adminPlayerDirectory.find((item) => item.name.toLowerCase() === me.user.displayName.toLowerCase());
    if (player) setCurrentPersona(player.id);
  }

  club.name = membership.name;
  if (membership.logoUrl) club.logoUrl = versionedAssetUrl(membership.logoUrl);

  try { localStorage.setItem(SELECTED_CLUB_KEY, membership.clubId); } catch (_) {}
  const requests = [
    platformRequest(`/api/v2/clubs/${membership.clubId}/credit-rules`),
    platformRequest(`/api/v2/clubs/${membership.clubId}/me/credit`),
    platformRequest(`/api/v2/clubs/${membership.clubId}/${state.role === "admin" ? "members" : "directory"}`),
    platformRequest(`/api/v2/clubs/${membership.clubId}/events`),
    platformRequest(`/api/v2/clubs/${membership.clubId}/relationships`),
    platformRequest(`/api/v2/clubs/${membership.clubId}/${state.role === "player" ? "me/orders" : "orders"}`),
    ["player", "admin", "stringer"].includes(state.role)
      ? platformRequest(`/api/v2/clubs/${membership.clubId}/${state.role === "player" ? "me/stringing-jobs" : "stringing-jobs"}`)
      : Promise.resolve({ jobs: [] }),
    platformRequest(`/api/v2/clubs/${membership.clubId}/polls`),
    platformRequest(`/api/v2/clubs/${membership.clubId}/tournaments`),
    ["admin", "seller"].includes(state.role) ? platformRequest(`/api/v2/clubs/${membership.clubId}/supplier-requests`) : Promise.resolve({ requests: [] }),
    state.role === "admin" ? platformRequest(`/api/v2/clubs/${membership.clubId}/reservation-series`) : Promise.resolve({ series: [] }),
    platformRequest(`/api/v2/me/agenda?from=${dateToIso(appToday)}`),
    state.role === "admin" ? platformRequest(`/api/v2/clubs/${membership.clubId}/analytics?from=${dateToIso(new Date(appToday.getFullYear(), appToday.getMonth() - 5, 1))}&to=${dateToIso(new Date(appToday.getFullYear(), appToday.getMonth() + 1, 0))}`) : Promise.resolve(null),
    platformRequest(`/api/v2/clubs/${membership.clubId}/${state.role === "player" ? "me/charges" : "charges"}`).catch(() => ({ charges: [] })),
    platformRequest("/api/v2/me/privacy").catch(() => platformPrivacy),
    platformRequest("/api/v2/me/notification-preferences").catch(() => ({ preferences: {} })),
    platformRequest("/api/v2/me/connections").catch(() => platformConnections),
    platformRequest(`/api/v2/clubs/${membership.clubId}/context`)
  ];
  const [rules, wallet, members, eventPayload, relationshipPayload, orderPayload, stringingPayload, pollPayload, tournamentPayload, supplierPayload, seriesPayload, agendaPayload, analyticsPayload, chargePayload, privacyPayload, notificationPreferencePayload, connectionPayload, clubContextPayload] = await Promise.all(requests);
  replaceArray(creditBonusRules, (rules.rules || []).map((rule) => ({
    id: rule.id,
    name: rule.label,
    paid: Number(rule.thresholdMinor || 0) / 100,
    bonus: Number(rule.bonusMinor || 0) / 100,
    note: rule.note || "Bonus podle pravidel klubu."
  })));
  if (state.role === "player") applyPlatformWallet(wallet);

  platformContext.membersByPersona.clear();
  (members?.members || []).forEach((member) => {
    const player = ensurePlatformDirectoryPlayer(member);
    if (player) platformContext.membersByPersona.set(player.id, member.membershipId);
  });
  if (!account?.persona) {
    const player = adminPlayerDirectory.find((item) => item.name.toLowerCase() === me.user.displayName.toLowerCase());
    if (player) setCurrentPersona(player.id);
  }
  applyPlatformEvents(eventPayload);
  applyPlatformRelationships(relationshipPayload);
  applyPlatformOrders(orderPayload);
  applyPlatformStringing(stringingPayload);
  applyPlatformPolls(pollPayload);
  applyPlatformTournaments(tournamentPayload);
  applyPlatformSupplierRequests(supplierPayload);
  applyPlatformReservationSeries(seriesPayload);
  platformAgenda = { reservations: agendaPayload.reservations || [], events: agendaPayload.events || [] };
  platformAnalytics = analyticsPayload;
  platformCharges = chargePayload.charges || [];
  adminPayments.splice(0, adminPayments.length, ...platformCharges.map((charge) => ({ id: charge.id, player: charge.player || currentUser.name, item: `${charge.court_name} · ${charge.reservation_date} ${charge.start_time}-${charge.end_time}`, amount: formatMoney(Number(charge.final_minor || 0) / 100), status: charge.status, reservationId: charge.reservation_id })));
  platformPrivacy = privacyPayload;
  platformNotificationPreferences = notificationPreferencePayload.preferences || {};
  platformConnections = connectionPayload;
  platformModules = clubContextPayload.modules || [];
  const configuredCancellation = Number(clubContextPayload.club?.publicConfig?.reservationCancellationMinutes);
  if (Number.isInteger(configuredCancellation) && configuredCancellation >= 0) club.cancellationMinutes = configuredCancellation;
  await refreshPlatformReservations();
  saveLoginSession({ email: me.user.email, role: state.role, persona: state.persona });
  applyClubBranding();
  return true;
}

async function syncPlatformLiveData({ silent = true } = {}) {
  if (!platformContext.enabled || !platformContext.clubId || platformSyncInFlight || document.hidden) return false;
  platformSyncInFlight = true;
  const previousNoticeCount = visibleNotifications().length;
  try {
    const tasks = [
      refreshPlatformReservations(),
      refreshPlatformEvents(),
      refreshPlatformRelationships(),
      refreshPlatformOrders(),
      refreshPlatformPolls(),
      refreshPlatformTournaments()
    ];
    if (["admin", "stringer"].includes(state.role)) tasks.push(refreshPlatformStringing());
    if (["admin", "seller"].includes(state.role)) tasks.push(refreshPlatformSupplierRequests());
    if (state.role === "admin") tasks.push(refreshPlatformReservationSeries());
    if (state.role === "player") {
      tasks.push(platformRequest(`/api/v2/clubs/${platformContext.clubId}/me/credit`).then((wallet) => applyPlatformWallet(wallet)));
    }
    await Promise.all(tasks);
    render();
    if (!silent && visibleNotifications().length > previousNoticeCount) showToast("Dorazila nova zprava v portalu.");
    return true;
  } catch (error) {
    if (error?.status === 401) {
      await completeLogout();
      render();
      if (!loginPromptShown) {
        loginPromptShown = true;
        openModal("login");
      }
    }
    return false;
  } finally {
    platformSyncInFlight = false;
  }
}

function startPlatformSync() {
  if (!platformContext.enabled || platformSyncTimer) return;
  platformSyncTimer = window.setInterval(() => {
    if (!document.hidden) syncPlatformLiveData({ silent: false });
  }, 60000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncPlatformLiveData({ silent: false });
  });
  window.addEventListener("focus", () => syncPlatformLiveData({ silent: false }));
  window.addEventListener("online", () => syncPlatformLiveData({ silent: false }));
}

function replaceArray(target, source) {
  if (!Array.isArray(source)) return;
  target.splice(0, target.length, ...source);
}

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image could not be opened"));
    };
    image.src = url;
  });
}

async function optimizeImage(file, kind = "photo") {
  if (!file?.type?.startsWith("image/")) throw new Error("Only images are allowed");
  const image = await loadImageFile(file);
  const square = ["profile", "club-logo"].includes(kind);
  const maxWidth = square ? 720 : 1600;
  const maxHeight = square ? 720 : 1200;
  const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(image, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Image conversion failed")), "image/webp", 0.82);
  });
}

async function uploadImageFile(file, kind, targetId) {
  const image = await optimizeImage(file, kind);
  if (platformContext.enabled) {
    const query = new URLSearchParams({ clubId: platformContext.clubId, entityType: kind, entityId: String(targetId || "new") });
    const response = await fetch(`${PLATFORM_API_BASE}/api/v2/media?${query}`, { method: "POST", headers: { "Content-Type": "image/webp" }, body: image, credentials: "include" });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.asset?.url) throw new Error(result?.error?.message || "Image upload failed");
    return `${PLATFORM_API_BASE}${result.asset.url}`;
  }
  if (!API_BASE) throw new Error("Shared API is not configured");
  const safeTarget = String(targetId || "new").replace(/[^a-zA-Z0-9_-]/g, "-");
  const unique = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const key = `${kind}/${safeTarget}/${unique}.webp`;
  const response = await fetch(apiUrl(`/api/images/${encodeURIComponent(key)}`), {
    method: "PUT",
    headers: { "Content-Type": "image/webp" },
    body: image
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.url) throw new Error(result?.error || "Image upload failed");
  return result.url;
}

function setUploadPreview(input, url) {
  const previewId = input.dataset.preview;
  const preview = previewId ? document.querySelector(`#${previewId}`) : null;
  if (preview) preview.src = url;
  const urlInputId = input.dataset.urlInput;
  const urlInput = urlInputId ? document.querySelector(`#${urlInputId}`) : null;
  if (urlInput) urlInput.value = url;
}

async function handleImageUpload(input) {
  const file = input.files?.[0];
  if (!file) return;
  input.disabled = true;
  showToast("Nahravam a upravuji obrazek...");
  try {
    const kind = input.dataset.imageKind || "photo";
    const targetId = input.dataset.targetId || currentPersonaId();
    const url = await uploadImageFile(file, kind, targetId);
    setUploadPreview(input, url);

    if (kind === "profile") {
      const player = playerRecordById(targetId);
      if (player) player.photo = url;
      if (targetId === currentPersonaId()) currentUser.photo = url;
    } else if (kind === "reservation") {
      const reservation = personalReservations.find((item) => item.id === targetId);
      if (reservation) {
        reservation.photos = Array.isArray(reservation.photos) ? reservation.photos : [];
        reservation.photos.push(url);
      }
    } else if (kind === "court" && targetId !== "new") {
      const court = courts.find((item) => item.id === targetId);
      if (court) court.photo = url;
    } else if (kind === "event" && targetId !== "new") {
      const event = events.find((item) => item.id === targetId);
      if (event) event.thumbnail = url;
    } else if (kind === "club-logo") {
      club.logoUrl = url;
      applyClubBranding();
    }

    persistData();
    render();
    showToast("Obrazek je nahrany a ulozeny.");
  } catch (error) {
    showToast("Obrazek se nepodarilo nahrat. Zkontroluj pripojeni a format souboru.");
  } finally {
    input.disabled = false;
  }
}

function portalStatePayload() {
  return {
    version: DATA_SCHEMA_VERSION,
    clientUpdatedAt: stateRevisionAt,
    club,
    courts,
    events,
    courtPriceRules,
    adminReservations,
    playerOrders,
    creditBonusRules,
    creditTransactions,
    stringingOrders,
    clubPolls,
    tournaments,
    players,
    guestProfiles,
    notifications,
    friendships,
    friendRequests,
    gameProposals,
    personalReservations,
    joinedEvents: [...state.joinedEvents],
    joinedEventsByPlayer: state.joinedEventsByPlayer
  };
}

function cloneData(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function sameData(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function entityKey(item, index, collectionName) {
  if (item?.id) return item.id;
  if (item?.reservationId) return item.reservationId;
  if (collectionName === "courtPriceRules") return `${item.court}-${item.days}-${item.start}-${item.end}`;
  return `${collectionName}-${index}`;
}

function mergeEntityArray(base = [], local = [], remote = [], collectionName = "items") {
  const toMap = (items) => new Map(items.map((item, index) => [entityKey(item, index, collectionName), item]));
  const baseMap = toMap(base);
  const localMap = toMap(local);
  const remoteMap = toMap(remote);
  for (const [key, baseItem] of baseMap) {
    if (!localMap.has(key)) remoteMap.delete(key);
    else if (!sameData(localMap.get(key), baseItem)) remoteMap.set(key, cloneData(localMap.get(key)));
  }
  for (const [key, localItem] of localMap) {
    if (!baseMap.has(key)) remoteMap.set(key, cloneData(localItem));
  }
  return [...remoteMap.values()];
}

function mergeCourts(base = [], local = [], remote = []) {
  const merged = mergeEntityArray(base, local, remote, "courts");
  return merged.map((court) => {
    const baseCourt = base.find((item) => item.id === court.id) || {};
    const localCourt = local.find((item) => item.id === court.id) || {};
    const remoteCourt = remote.find((item) => item.id === court.id) || court;
    if (!localCourt.id) return court;
    return {
      ...court,
      reservations: mergeEntityArray(
        baseCourt.reservations || [],
        localCourt.reservations || [],
        remoteCourt.reservations || [],
        `court-${court.id}-reservations`
      )
    };
  });
}

function mergeConcurrentState(remoteState, localState, baseState) {
  if (!baseState) return cloneData(localState);
  const merged = cloneData(remoteState);
  const entityCollections = [
    "events", "adminReservations", "playerOrders", "stringingOrders", "clubPolls", "creditBonusRules", "creditTransactions",
    "tournaments", "players", "guestProfiles", "notifications", "friendships", "friendRequests",
    "gameProposals", "personalReservations"
  ];
  merged.courts = mergeCourts(baseState.courts || [], localState.courts || [], remoteState.courts || []);
  entityCollections.forEach((key) => {
    merged[key] = mergeEntityArray(baseState[key] || [], localState[key] || [], remoteState[key] || [], key);
  });
  ["club", "courtPriceRules", "joinedEvents", "joinedEventsByPlayer"].forEach((key) => {
    if (!sameData(baseState[key], localState[key])) merged[key] = cloneData(localState[key]);
  });
  merged.version = localState.version;
  return merged;
}

function migrateDateFields() {
  personalReservations.forEach((reservation) => {
    if (!reservation.isoDate) reservation.isoDate = reservationIsoDate(reservation);
    const date = dateFromIso(reservation.isoDate);
    if (date) {
      reservation.day = weekdayCodes[date.getDay()];
      reservation.date = String(date.getDate());
      reservation.month = date.getMonth();
      reservation.year = date.getFullYear();
    }
  });
  courts.forEach((court) => {
    court.reservations.forEach((slot) => {
      if (slot.isoDate) return;
      const linked = slot.reservationId ? personalReservations.find((reservation) => reservation.id === slot.reservationId) : null;
      if (linked?.isoDate) slot.isoDate = linked.isoDate;
      else if (typeof slot.day === "number") slot.isoDate = dateToIso(dateForWeekIndex(slot.day));
      else if (court.id === "c1" && slot.title === "Patecni double") slot.isoDate = seedFridayIso;
    });
  });
  personalReservations.forEach((reservation) => {
    const activePlayers = normalizedAttendance(reservation).filter(activeForGame);
    if (activePlayers.length === 0) reservation.status = "cancelled";
  });
  courts.forEach((court) => {
    court.reservations = court.reservations.filter((slot) => {
      const linked = slot.reservationId ? personalReservations.find((reservation) => reservation.id === slot.reservationId) : null;
      return !linked || linked.status !== "cancelled";
    });
  });
  syncReservationCourtReferences();
  notifications.splice(0, notifications.length, ...notifications.filter((item) => {
    if (item.reservationIndex === undefined) return true;
    return personalReservations[item.reservationIndex]?.status !== "cancelled";
  }));
  adminReservations.splice(0, adminReservations.length, ...adminReservations.filter((item) => {
    if (!item.reservationId) return true;
    return reservationById(item.reservationId)?.status !== "cancelled";
  }));
  adminReservations.forEach((item) => {
    const reservation = item.reservationId ? reservationById(item.reservationId) : null;
    if (reservation) item.time = `${reservationDateLabel(reservation)} ${reservation.start}-${reservation.end}`;
  });
}

function applyStoredState(saved) {
  if (!saved || saved.version !== DATA_SCHEMA_VERSION) return false;
  suppressRemotePersist = true;
  if (typeof saved.clientUpdatedAt === "string") stateRevisionAt = saved.clientUpdatedAt;
  if (saved.club) Object.assign(club, saved.club);
  replaceArray(courts, saved.courts);
  replaceArray(events, saved.events);
  replaceArray(courtPriceRules, saved.courtPriceRules.map((rule, index) => ({
    ...rule,
    id: rule.id || `local-price-restored-${index}-${String(rule.court || "court")}`
  })));
  replaceArray(adminReservations, saved.adminReservations);
  replaceArray(playerOrders, saved.playerOrders);
  replaceArray(creditBonusRules, saved.creditBonusRules);
  replaceArray(creditTransactions, saved.creditTransactions);
  replaceArray(stringingOrders, saved.stringingOrders);
  replaceArray(clubPolls, saved.clubPolls);
  replaceArray(tournaments, saved.tournaments);
  replaceArray(notifications, saved.notifications);
  replaceArray(friendships, saved.friendships);
  replaceArray(friendRequests, saved.friendRequests);
  replaceArray(gameProposals, saved.gameProposals);
  replaceArray(personalReservations, saved.personalReservations);
  if (Array.isArray(saved.joinedEvents)) state.joinedEvents = new Set(saved.joinedEvents);
  if (saved.joinedEventsByPlayer) state.joinedEventsByPlayer = saved.joinedEventsByPlayer;
  if (Array.isArray(saved.players)) {
    replaceArray(players, saved.players);
    replaceArray(adminPlayerDirectory, saved.players.map((player) => ({
      ...player,
      adminNote: visibleAdminNote(player)
    })));
  }
  if (Array.isArray(saved.guestProfiles)) {
    saved.guestProfiles.forEach((savedGuest) => {
      const guest = adminPlayerDirectory.find((item) => item.id === savedGuest.id);
      if (guest) Object.assign(guest, savedGuest);
    });
  }
  migrateDateFields();
  setCurrentPersona(state.persona);
  suppressRemotePersist = false;
  return true;
}

async function pushRemoteState(payload, baseUpdatedAt = remoteUpdatedAt, allowMerge = true) {
  const response = await fetch(apiUrl("/api/state"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: payload, baseUpdatedAt })
  });
  const result = await response.json().catch(() => null);
  if (response.status === 409 && result?.state && allowMerge) {
    let merged = mergeConcurrentState(result.state, payload, lastRemoteState);
    const currentPayload = portalStatePayload();
    if (!sameData(currentPayload, payload)) {
      merged = mergeConcurrentState(merged, currentPayload, payload);
    }
    applyStoredState(merged);
    render();
    return pushRemoteState(merged, result.updatedAt, false);
  }
  if (!response.ok) throw new Error(result?.error || "API save failed");
  if (result?.updatedAt) remoteUpdatedAt = result.updatedAt;
  lastRemoteState = cloneData(payload);
  return result;
}

function persistData() {
  stateRevisionAt = new Date().toISOString();
  const payload = cloneData(portalStatePayload());
  lastLocalPersistAt = Date.now();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (_) {}

  if (sharedApiOnline && !suppressRemotePersist) {
    remoteSavesPending += 1;
    remoteSaveQueue = remoteSaveQueue
      .catch(() => null)
      .then(() => pushRemoteState(payload))
      .catch(() => {
        sharedApiOnline = false;
        showToast("API je nedostupne, zmeny jsou zatim jen v tomto zarizeni.");
      })
      .finally(() => {
        remoteSavesPending = Math.max(0, remoteSavesPending - 1);
      });
  }
}

async function hydrateStoredData() {
  let localSaved = null;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (parsed?.version === DATA_SCHEMA_VERSION) localSaved = parsed;
  } catch (_) {}
  try {
    const response = await fetch(apiUrl("/api/state"), { cache: "no-store" });
    if (response.ok) {
      const payload = await response.json();
      sharedApiOnline = true;
      if (payload.updatedAt) remoteUpdatedAt = payload.updatedAt;
      if (payload.state) lastRemoteState = cloneData(payload.state);
      const localIsNewer = localSaved?.clientUpdatedAt &&
        (!payload.state?.clientUpdatedAt || localSaved.clientUpdatedAt > payload.state.clientUpdatedAt);
      if (localIsNewer && applyStoredState(localSaved)) {
        await pushRemoteState(localSaved, remoteUpdatedAt).catch(() => null);
        return "local";
      }
      if (payload.state && applyStoredState(payload.state)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(portalStatePayload()));
        return "api";
      }
    }
  } catch (_) {
    sharedApiOnline = false;
  }

  try {
    const saved = localSaved || JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved) return sharedApiOnline ? "seed" : "default";
    if (saved.version !== DATA_SCHEMA_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      return sharedApiOnline ? "seed" : "default";
    }
    if (applyStoredState(saved)) return sharedApiOnline ? "seed" : "local";
  } catch (_) {}
  return sharedApiOnline ? "seed" : "default";
}

async function syncRemoteState({ silent = true } = {}) {
  if (!sharedApiOnline) return false;
  if (remoteSavesPending > 0) return false;
  if (Date.now() - lastLocalPersistAt < 1200) return false;
  try {
    const response = await fetch(apiUrl("/api/state"), { cache: "no-store" });
    if (!response.ok) return false;
    const payload = await response.json();
    sharedApiOnline = true;
    if (!payload.state || !payload.updatedAt || payload.updatedAt === remoteUpdatedAt) return false;
    if (!applyStoredState(payload.state)) return false;
    remoteUpdatedAt = payload.updatedAt;
    lastRemoteState = cloneData(payload.state);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(portalStatePayload()));
    } catch (_) {}
    render();
    if (!silent && visibleNotifications().length) showToast("Dorazila nova zprava v portalu.");
    return true;
  } catch (_) {
    sharedApiOnline = false;
    return false;
  }
}

function startRemoteSync() {
  if (syncTimer || !API_BASE) return;
  syncTimer = window.setInterval(() => {
    syncRemoteState({ silent: false });
  }, 4000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncRemoteState({ silent: false });
  });
  window.addEventListener("focus", () => syncRemoteState({ silent: false }));
}

function timeToMinutes(time) {
  const match = String(time || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

function isValidTime(time) {
  return Number.isFinite(timeToMinutes(time));
}

function minutesToTime(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function monthName(year, month) {
  return new Intl.DateTimeFormat("cs-CZ", { month: "long", year: "numeric" }).format(new Date(year, month, 1));
}

function dateToIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromIso(isoDate = "") {
  const match = String(isoDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateForWeekIndex(index = state.selectedDay) {
  const date = new Date(appToday);
  date.setDate(date.getDate() + Number(index || 0));
  return date;
}

function selectedBookingDateObject() {
  return dateFromIso(state.selectedBookingDate) || dateForWeekIndex();
}

function selectedBookingIsoDate() {
  return dateToIso(selectedBookingDateObject());
}

function formatPortalDate(date, includeWeekday = true) {
  return new Intl.DateTimeFormat("cs-CZ", {
    weekday: includeWeekday ? "long" : undefined,
    day: "numeric",
    month: "numeric",
    year: "numeric"
  }).format(date);
}

function formatShortPortalDate(date) {
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
}

function dateInputValue(date) {
  return dateToIso(date);
}

function dateFromDateInput(value = "") {
  return dateFromIso(value) || appToday;
}

function nextTournamentSaturday() {
  const date = new Date(appToday.getFullYear(), appToday.getMonth(), appToday.getDate());
  let offset = (6 - date.getDay() + 7) % 7;
  if (offset < 3) offset += 7;
  date.setDate(date.getDate() + offset);
  return date;
}

function reservationIsoDate(reservation = {}) {
  if (dateFromIso(reservation.isoDate)) return reservation.isoDate;
  const timestampMatch = String(reservation.id || "").match(/(?:reservation|proposal|order|stringing)-(\d{12,})/);
  if (timestampMatch && ["Dnes", "Zitra"].includes(reservation.day)) {
    const created = new Date(Number(timestampMatch[1]));
    if (!Number.isNaN(created.getTime())) {
      created.setHours(12, 0, 0, 0);
      if (reservation.day === "Zitra") created.setDate(created.getDate() + 1);
      return dateToIso(created);
    }
  }
  const numericDay = Number(reservation.date);
  if (numericDay > 0) {
    const year = Number(reservation.year) || state.calendarYear || appToday.getFullYear();
    const month = Number.isInteger(reservation.month) ? reservation.month : state.calendarMonth;
    return dateToIso(new Date(year, month, numericDay, 12));
  }
  return selectedBookingIsoDate();
}

function courtSnapshot(court = courts[0]) {
  return {
    id: court.id,
    name: court.name,
    surface: court.surface,
    surfaceClass: court.surfaceClass,
    color: court.color,
    photo: court.photo
  };
}

function syncReservationCourtReferences() {
  personalReservations.forEach((reservation) => {
    if (!reservation?.id) return;
    const linked = courtReservationById(reservation.id);
    const court = linked?.court || courts.find((item) =>
      item.id === reservation.court?.id ||
      item.name === reservation.court?.name
    );
    if (!court) return;
    reservation.court = courtSnapshot(court);
    if (linked?.reservation) {
      const slot = linked.reservation;
      if (!slot.isoDate) slot.isoDate = reservationIsoDate(reservation);
      if (!isValidTime(slot.start) && isValidTime(reservation.start)) slot.start = reservation.start;
      if (!isValidTime(slot.end) && isValidTime(reservation.end)) slot.end = reservation.end;
      slot.players = normalizedAttendance(reservation).map((player) => player.name);
    }
  });
  adminReservations.forEach((item) => {
    const reservation = item.reservationId ? reservationById(item.reservationId) : null;
    if (!reservation) return;
    item.time = `${reservationDateLabel(reservation)} ${reservation.start}-${reservation.end}`;
    item.court = reservation.court?.name || item.court;
    item.surface = reservation.court?.surface || item.surface;
    item.players = `${normalizedAttendance(reservation).filter(activeForGame).length}/${reservationTargetPlayers(reservation)}`;
  });
}

function fullDayName(shortDay) {
  return {
    Po: "Pondělí",
    Ut: "Úterý",
    St: "Středa",
    Ct: "Čtvrtek",
    Pa: "Pátek",
    So: "Sobota",
    Ne: "Nedele",
    Dnes: "Dnes",
    Zitra: "Zitra"
  }[shortDay] || shortDay;
}

function calendarCells(year, month) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayIndex = (first.getDay() + 6) % 7;
  const total = Math.ceil((mondayIndex + daysInMonth) / 7) * 7;
  return Array.from({ length: total }, (_, index) => {
    const day = index - mondayIndex + 1;
    return day > 0 && day <= daysInMonth ? day : "";
  });
}

function moveCalendar(delta) {
  const date = new Date(state.calendarYear, state.calendarMonth + delta, 1);
  state.calendarYear = date.getFullYear();
  state.calendarMonth = date.getMonth();
}

function slots() {
  const start = timeToMinutes(club.open);
  const end = timeToMinutes(club.close);
  const result = [];
  for (let value = start; value < end; value += club.slotMinutes) {
    result.push(minutesToTime(value));
  }
  return result;
}

function playerRecordById(id) {
  return adminPlayerDirectory.find((player) => player.id === id) || players.find((player) => player.id === id);
}

function playerRecordByNameOrInitials(player) {
  const normalizedName = (player.name || "").toLowerCase();
  const initials = player.initials === "TH" ? "TC" : player.initials;
  if (player.playerId) return playerRecordById(player.playerId);
  return adminPlayerDirectory.find((item) =>
    item.initials === initials ||
    normalizedName.includes(item.name.split(" ")[0].toLowerCase())
  ) || (initials === "RB" ? currentUser : null);
}

function normalizeAttendancePlayer(player) {
  const record = playerRecordByNameOrInitials(player) || {};
  const fullName = player.name || record.name || "";
  return {
    ...player,
    playerId: player.playerId || record.id || (player.initials === "RB" ? "radim" : undefined),
    name: fullName,
    initials: player.initials === "TH" ? "TC" : (player.initials || record.initials || ""),
    gender: player.gender || record.gender || (["Handa", "Viki"].some((name) => fullName.includes(name)) ? "female" : "male")
  };
}

function normalizedAttendance(reservation) {
  const attendance = reservation.attendance || reservation.players.map((name) => ({
    name,
    initials: name.slice(0, 2).toUpperCase(),
    status: "confirmed",
    role: "potvrdil"
  }));
  return attendance.map(normalizeAttendancePlayer);
}

function activeForGame(player) {
  return ["active", "confirmed", "replacement"].includes(player.status);
}

function reservationGameType(reservation) {
  if (reservation.gameType) return reservation.gameType;
  const declaredCount = reservation.players?.length || normalizedAttendance(reservation).length;
  return declaredCount <= 2 ? "single" : "double";
}

function reservationTargetPlayers(reservation) {
  return reservationGameType(reservation) === "single" ? 2 : 4;
}

function reservationGameLabel(reservation) {
  return reservationGameType(reservation) === "single" ? "Single · 2 hraci" : "Double · 4 hraci";
}

function suggestedReplacementId(reservation, declinedPlayerId) {
  const used = new Set(normalizedAttendance(reservation).map((player) => player.playerId));
  const activeFriendIds = normalizedAttendance(reservation)
    .filter(activeForGame)
    .flatMap((player) => friendsForPlayer(player.playerId).map((friend) => friend.id));
  const preferred = [
    ...activeFriendIds,
    "filip", "marek", "darek", "zbyna", "prema", "handa", "viki", "robin", "bob", "honza", "radim"
  ];
  return preferred.find((id) => id !== declinedPlayerId && !used.has(id)) || "filip";
}

function startReplacementVote(reservationIndex, declinedPlayerId) {
  const reservation = personalReservations[reservationIndex];
  if (!reservation?.attendance) return false;
  const target = reservationTargetPlayers(reservation);
  const active = normalizedAttendance(reservation).filter(activeForGame);
  if (active.length === 0) return false;
  if (active.length >= target) return false;
  const candidateId = suggestedReplacementId(reservation, declinedPlayerId);
  const hasCandidate = normalizedAttendance(reservation).some((player) => player.playerId === candidateId);
  if (!hasCandidate) {
    reservation.attendance.push(attendanceFromPlayerId(candidateId, "candidate", "navrzen systemem"));
  }
  const recipients = normalizedAttendance(reservation)
    .filter((player) => !["declined", "candidate"].includes(player.status) && player.playerId && player.playerId !== declinedPlayerId)
    .map((player) => player.playerId);
  const candidate = playerRecordById(candidateId);
  const id = `replacement-vote-${reservationIndex}-${candidateId}`;
  notifications.splice(0, notifications.length, ...notifications.filter((item) => item.id !== id));
  notifications.push({
    id,
    type: "replacement",
    recipients,
    title: "Hlasovani o nahradnikovi",
    meta: `${candidate?.name || "Nahradnik"} muze doplnit ${reservationGameType(reservation) === "single" ? "single" : "double"} ${reservationDateLabel(reservation)} ${reservation.start}`,
    status: "Ceka na hlasovani",
    reservationIndex,
    candidateId,
    votes: {}
  });
  return true;
}

function refreshReservationLineup(reservationIndex = 0) {
  const reservation = personalReservations[reservationIndex];
  if (!reservation?.attendance) return false;
  const attendance = normalizedAttendance(reservation);
  const active = attendance.filter(activeForGame);
  const pending = attendance.some((player) => player.status === "pending");
  const target = reservationTargetPlayers(reservation);
  reservation.players = active.map((player) => player.name);
  const linked = courtReservationById(reservation.id);
  if (linked) {
    linked.reservation.players = [...reservation.players];
    linked.reservation.type = pending ? "pending" : active.length >= target ? "mine" : "group";
    linked.reservation.title = pending
      ? "Ceka na spoluhrace"
      : active.length >= target
        ? (reservation.gameType === "single" ? "Dvouhra potvrzena" : "Ctyrhra potvrzena")
        : "Hleda spoluhrace";
  }
  const admin = adminReservations.find((item) => item.reservationId === reservation.id);
  if (admin) {
    admin.status = pending ? "Ceka na potvrzeni" : active.length >= target ? "Plna sestava" : "Ceka na hrace";
    admin.players = `${active.length}/${target}`;
    admin.tone = active.length >= target && !pending ? "good" : "warn";
  }
  return true;
}

async function declineReservation(reservationIndex = 0) {
  const reservation = personalReservations[reservationIndex];
  if (!reservation?.attendance) return false;
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/reservations/${reservation.id}/withdraw`, { method: "POST" });
      await refreshPlatformReservations();
      lastActionMessage = "Omluvenka je ulozena a ostatni hraci dostali zpravu.";
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  const playerId = currentPersonaId();
  const me = reservation.attendance.find((player) => normalizeAttendancePlayer(player).playerId === playerId);
  if (!me) return false;
  me.status = "declined";
  me.role = "omluvil se";
  notifications.splice(0, notifications.length, ...notifications.filter((item) =>
    !(item.type === "attendance" && item.reservationIndex === reservationIndex && item.recipients?.includes(playerId))
  ));
  const active = normalizedAttendance(reservation).filter(activeForGame);
  if (active.length === 0) {
    reservation.status = "cancelled";
    courts.forEach((court) => {
      court.reservations = court.reservations.filter((slot) => slot.reservationId !== reservation.id);
    });
    notifications.splice(0, notifications.length, ...notifications.filter((item) => item.reservationIndex !== reservationIndex));
  } else {
    startReplacementVote(reservationIndex, playerId);
    refreshReservationLineup(reservationIndex);
  }
  persistData();
  return true;
}

async function undoReservationDecline(reservationIndex = 0) {
  const reservation = personalReservations[reservationIndex];
  const playerId = currentPersonaId();
  if (!canUndoReservationDecline(reservation, playerId) || !reservation?.attendance) {
    lastActionMessage = "Omluvenku uz nejde vzit zpet, protoze nahradnik byl potvrzen nebo rezervace uz neexistuje.";
    return false;
  }
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/reservations/${reservation.id}/withdraw/undo`, { method: "POST" });
      await refreshPlatformReservations();
      lastActionMessage = "Omluvenka je zrusena a hrac je znovu v sestave.";
      return true;
    } catch (error) {
      lastActionMessage = error.code === "replacement_already_filled"
        ? "Omluvenku uz nejde vzit zpet, misto obsadil potvrzeny nahradnik."
        : error.message;
      return false;
    }
  }
  const me = reservation.attendance.find((player) => normalizeAttendancePlayer(player).playerId === playerId);
  if (!me) return false;
  me.status = "confirmed";
  me.role = "omluvenka zrusena";
  reservation.attendance = reservation.attendance.filter((player) => {
    const normalized = normalizeAttendancePlayer(player);
    return !["candidate"].includes(normalized.status);
  });
  refreshReservationLineup(reservationIndex);
  notifications.splice(0, notifications.length, ...notifications.filter((item) =>
    item.reservationIndex !== reservationIndex &&
    item.reservationId !== reservation.id
  ));
  lastActionMessage = "Omluvenka je zrusena, nahradnici a hlasovani k terminu jsou uklizene.";
  persistData();
  return true;
}

function setCurrentPersona(personaId) {
  const record = playerRecordById(personaId) || adminPlayerDirectory[0] || currentUser;
  state.persona = personaId;
  currentUser.name = record.name;
  currentUser.initials = record.initials;
  currentUser.credit = record.credit || 0;
  currentUser.paidCredit = record.paidCredit || 0;
  currentUser.bonusCredit = record.bonusCredit || 0;
  currentUser.playerType = record.accountType || "club";
  currentUser.discount = record.discount || 0;
  currentUser.baseDiscount = record.baseDiscount || 0;
  currentUser.loyaltyDiscount = record.loyaltyDiscount || 0;
  currentUser.playedHours = record.playedHours || 0;
  currentUser.nextLoyaltyHours = record.nextLoyaltyHours || 25;
  currentUser.photo = record.photo || "";
}

function avatarContent(player, fallback = "") {
  return player?.photo ? `<img src="${player.photo}" alt="${player.name || "Hrac"}">` : (fallback || player?.initials || "");
}

function applyAvatarPhotos(root = document) {
  root.querySelectorAll(".avatar[data-player]").forEach((avatar) => {
    const player = playerRecordById(avatar.dataset.player);
    if (player?.photo) avatar.innerHTML = avatarContent(player);
  });
}

function currentPersonaId() {
  return state.role === "player" ? state.persona : "radim";
}

function friendshipKey(playerA = "", playerB = "") {
  return [playerA, playerB].filter(Boolean).sort().join("__");
}

function areFriends(playerA = currentPersonaId(), playerB = "") {
  if (!playerA || !playerB || playerA === playerB) return false;
  const key = friendshipKey(playerA, playerB);
  return friendships.some((item) => item.id === key || friendshipKey(...(item.players || [])) === key);
}

function friendRequestBetween(playerA = currentPersonaId(), playerB = "") {
  const key = friendshipKey(playerA, playerB);
  return friendRequests.find((item) => item.status === "pending" && friendshipKey(item.from, item.to) === key);
}

function friendsForPlayer(playerId = currentPersonaId()) {
  return adminPlayerDirectory.filter((player) => areFriends(playerId, player.id));
}

function relationshipState(playerId = "") {
  if (!playerId || playerId === currentPersonaId()) return "self";
  if (areFriends(currentPersonaId(), playerId)) return "friend";
  const request = friendRequestBetween(currentPersonaId(), playerId);
  if (!request) return "none";
  return request.from === currentPersonaId() ? "sent" : "received";
}

async function createFriendRequest(playerId = "") {
  const from = currentPersonaId();
  const to = playerId;
  if (!to || from === to || areFriends(from, to)) return false;
  const existing = friendRequestBetween(from, to);
  if (existing) {
    lastActionMessage = existing.from === from ? "Zadost o kamaradstvi uz ceka na potvrzeni." : "Hrac uz ti poslal zadost, muzes ji potvrdit v oznameni.";
    return false;
  }
  if (platformContext.enabled) {
    const targetMembershipId = platformContext.membersByPersona.get(to);
    if (!targetMembershipId) {
      lastActionMessage = "Hrac nema aktivni clenstvi v tomto klubu.";
      return false;
    }
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/friend-requests`, {
        method: "POST",
        body: JSON.stringify({ targetMembershipId })
      });
      await Promise.all([refreshPlatformRelationships(), refreshPlatformReservations()]);
      lastActionMessage = "Zadost o kamaradstvi byla odeslana.";
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  const sender = playerRecordById(from);
  friendRequests.push({
    id: `friend-request-${Date.now()}-${from}-${to}`,
    from,
    to,
    status: "pending",
    createdAt: new Date().toISOString()
  });
  notifications.push({
    id: `friend-request-${Date.now()}-${to}`,
    type: "friend-request",
    recipients: [to],
    title: "Zadost o kamaradstvi",
    meta: `${sender?.name || "Hrac"} chce byt tvuj kamarad v klubovem portalu.`,
    status: "Ceka na potvrzeni",
    requestFrom: from
  });
  persistData();
  return true;
}

async function acceptFriendRequest(notificationId = "") {
  const playerId = currentPersonaId();
  const notice = notifications.find((item) => item.id === notificationId) ||
    notifications.find((item) => item.type === "friend-request" && item.recipients?.includes(playerId));
  if (platformContext.enabled) {
    if (!notice?.friendRequestId) return false;
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/friend-requests/${notice.friendRequestId}/respond`, {
        method: "POST",
        body: JSON.stringify({ response: "accept" })
      });
      await Promise.all([refreshPlatformRelationships(), refreshPlatformReservations()]);
      lastActionMessage = "Kamaradstvi bylo potvrzeno.";
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  const request = notice
    ? friendRequests.find((item) => item.status === "pending" && item.from === notice.requestFrom && item.to === playerId)
    : friendRequests.find((item) => item.status === "pending" && item.to === playerId);
  if (!request) return false;
  const key = friendshipKey(request.from, request.to);
  if (!friendships.some((item) => item.id === key)) {
    friendships.push({ id: key, players: [request.from, request.to], createdAt: new Date().toISOString() });
  }
  request.status = "accepted";
  notifications.splice(0, notifications.length, ...notifications.filter((item) => item.id !== notice?.id));
  notifications.push({
    id: `friend-accepted-${Date.now()}-${request.from}`,
    type: "friend-accepted",
    recipients: [request.from],
    title: "Kamaradstvi potvrzeno",
    meta: `${playerRecordById(playerId)?.name || "Hrac"} potvrdil kamaradstvi. Muzete se rychleji zvat na hry.`,
    status: "Hotovo"
  });
  persistData();
  return true;
}

async function declineFriendRequest(notificationId = "") {
  const playerId = currentPersonaId();
  const notice = notifications.find((item) => item.id === notificationId);
  if (platformContext.enabled) {
    if (!notice?.friendRequestId) return false;
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/friend-requests/${notice.friendRequestId}/respond`, {
        method: "POST",
        body: JSON.stringify({ response: "decline" })
      });
      await Promise.all([refreshPlatformRelationships(), refreshPlatformReservations()]);
      lastActionMessage = "Zadost byla odmitnuta.";
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  const request = notice
    ? friendRequests.find((item) => item.status === "pending" && item.from === notice.requestFrom && item.to === playerId)
    : null;
  if (request) request.status = "declined";
  notifications.splice(0, notifications.length, ...notifications.filter((item) => item.id !== notificationId));
  persistData();
  return true;
}

function reservationHasPlayer(reservation, playerId = currentPersonaId()) {
  return normalizedAttendance(reservation).some((player) => player.playerId === playerId && player.status !== "declined");
}

function reservationHasAnyPlayer(reservation, playerId = currentPersonaId()) {
  return normalizedAttendance(reservation).some((player) => player.playerId === playerId);
}

function reservationDeclinedByPlayer(reservation, playerId = currentPersonaId()) {
  return normalizedAttendance(reservation).some((player) => player.playerId === playerId && player.status === "declined");
}

function reservationHasConfirmedReplacement(reservation) {
  return normalizedAttendance(reservation).some((player) => player.status === "replacement");
}

function canUndoReservationDecline(reservation, playerId = currentPersonaId()) {
  return Boolean(
    reservation &&
    reservation.status !== "cancelled" &&
    reservationDeclinedByPlayer(reservation, playerId) &&
    !reservationHasConfirmedReplacement(reservation)
  );
}

function normalizeDayKey(day = "") {
  const value = String(day).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const map = {
    pondeli: "Po",
    po: "Po",
    utery: "Ut",
    ut: "Ut",
    streda: "St",
    st: "St",
    ctvrtek: "Ct",
    ct: "Ct",
    patek: "Pa",
    pa: "Pa",
    sobota: "So",
    so: "So",
    nedele: "Ne",
    ne: "Ne",
    dnes: "Dnes",
    zitra: "Zitra"
  };
  return map[value] || day;
}

function sameReservationDay(reservation, day, date) {
  if (dateFromIso(date)) return reservationIsoDate(reservation) === date;
  const sameDate = date && String(reservation.date || "") === String(date || "");
  return sameDate || normalizeDayKey(reservation.day) === normalizeDayKey(day);
}

function timeRangesOverlap(startA, endA, startB, endB) {
  return timeToMinutes(endA) > timeToMinutes(startB) && timeToMinutes(startA) < timeToMinutes(endB);
}

function hasDateTimePassed(isoDate = "", endTime = "23:59", now = new Date()) {
  const date = dateFromIso(isoDate);
  if (!date || !isValidTime(endTime)) return false;
  const [hour, minute] = endTime.split(":").map(Number);
  date.setHours(hour, minute, 0, 0);
  return date.getTime() < now.getTime();
}

function reservationHasEnded(reservation, now = new Date()) {
  return Boolean(reservation && hasDateTimePassed(reservationIsoDate(reservation), reservation.end || "23:59", now));
}

function eventEndTime(event) {
  if (isValidTime(event.endTime)) return event.endTime;
  const range = String(event.meta || "").match(/\b\d{1,2}:\d{2}\s*-\s*(\d{1,2}:\d{2})\b/);
  return range?.[1] && isValidTime(range[1]) ? range[1] : "23:59";
}

function eventHasEnded(event, now = new Date()) {
  return Boolean(event?.isoDate && hasDateTimePassed(event.isoDate, eventEndTime(event), now));
}

function playerHasTimeCollision(playerId, day, date, start, end, ignoreReservationId = "") {
  return personalReservations.some((reservation) =>
    reservation.id !== ignoreReservationId &&
    sameReservationDay(reservation, day, date) &&
    reservationHasPlayer(reservation, playerId) &&
    timeRangesOverlap(reservation.start, reservation.end, start, end)
  );
}

function visibleReservations() {
  const playerId = currentPersonaId();
  return personalReservations.filter((reservation) =>
    reservation.status !== "cancelled" &&
    !reservationHasEnded(reservation) &&
    (
      normalizedAttendance(reservation).some((player) =>
        player.playerId === playerId && activeForGame(player)
      ) ||
      canUndoReservationDecline(reservation, playerId)
    )
  );
}

function visibleNotifications() {
  if (state.role !== "player") return [];
  const playerId = currentPersonaId();
  const explicit = notifications.filter((item) =>
    item.eventId && eventHasEnded(events.find((event) => event.id === item.eventId))
      ? false
      : item.reservationId && reservationHasEnded(reservationById(item.reservationId))
        ? false
    : item.eventId && events.find((event) => event.id === item.eventId)?.status === "cancelled" && item.type !== "event-cancelled"
      ? false
      : Array.isArray(item.recipients)
      ? item.recipients.includes(playerId)
      : item.reservationIndex !== undefined
        ? reservationHasPlayer(personalReservations[item.reservationIndex], playerId)
        : true
  );
  const generatedAttendance = personalReservations.flatMap((reservation, reservationIndex) => {
    if (reservationHasEnded(reservation)) return [];
    const me = normalizedAttendance(reservation).find((player) => player.playerId === playerId);
    const alreadyHasNotice = explicit.some((item) =>
      (item.type === "attendance" && item.reservationIndex === reservationIndex) ||
      (item.type === "booking-invite" && item.reservationId === reservation.id)
    );
    if (!me || me.status !== "pending" || alreadyHasNotice) return [];
    return [{
      id: `generated-attendance-${playerId}-${reservationIndex}`,
      type: "attendance",
      generated: true,
      recipients: [playerId],
      title: "Potvrdit ucast",
      meta: `${reservationDateLabel(reservation)} ${reservation.start}, ${reservation.court.name}`,
      status: "Ceka na tebe",
      reservationIndex
    }];
  });
  return explicit.concat(generatedAttendance);
}

function appBadgeCount() {
  if (state.role === "player") return visibleNotifications().length;
  if (state.role === "admin") return playerOrders.filter(orderNeedsAction).length;
  if (state.role === "stringer") return stringingOrders.filter((order) => order.status !== "delivered" && order.status !== "cancelled").length;
  if (state.role === "seller") return sellerEvents().filter((event) => event.status !== "published").length;
  return 0;
}

function orderNeedsAction(order) {
  return !["completed", "cancelled"].includes(order?.serverStatus || "") && !["predano hraci", "zruseno", "hotovo"].includes(String(order?.status || "").toLowerCase());
}

function updateAppBadge() {
  const count = appBadgeCount();
  try {
    if ("setAppBadge" in navigator && "clearAppBadge" in navigator) {
      if (count > 0) navigator.setAppBadge(count);
      else navigator.clearAppBadge();
    }
  } catch (error) {
    // Badge support differs between browsers; never block the portal on it.
  }
}

async function enablePortalNotifications() {
  let permission = "unsupported";
  try {
    if ("Notification" in window && Notification.permission !== "granted") {
      permission = await Notification.requestPermission();
    } else if ("Notification" in window) {
      permission = Notification.permission;
    }
    state.notificationsEnabled = permission === "granted" || permission === "unsupported";
    let pushReady = false;
    if (permission === "granted") pushReady = await registerPushSubscription();
    persistData();
    updateAppBadge();
    showToast(permission === "granted"
      ? (pushReady ? "Notifikace jsou aktivni i pri zavrene aplikaci." : "Telefon povolil notifikace, ale portal neni pripojeny k API.")
      : "Odznak je pripraveny, pro push bude potreba povoleni telefonu.");
  } catch (error) {
    showToast("Telefon nepovolil notifikace, portal ale funguje dal.");
  }
}

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

async function registerPushSubscription() {
  if ((!API_BASE && !platformContext.enabled) || state.role !== "player" || !("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  const registration = await navigator.serviceWorker.ready;
  const keyResponse = platformContext.enabled
    ? await fetch(`${PLATFORM_API_BASE}/api/v2/push/public-key`, { cache: "no-store", credentials: "include" })
    : await fetch(apiUrl("/api/push/vapid-public-key"), { cache: "no-store" });
  const keyPayload = await keyResponse.json();
  if (!keyResponse.ok || !keyPayload.publicKey) throw new Error("Push key unavailable");
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyPayload.publicKey)
    });
  }
  const response = await fetch(platformContext.enabled ? `${PLATFORM_API_BASE}/api/v2/push/subscriptions` : apiUrl("/api/push/subscribe"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: platformContext.enabled ? "include" : "same-origin",
    body: JSON.stringify(platformContext.enabled ? subscription.toJSON() : { playerId: currentPersonaId(), subscription: subscription.toJSON() })
  });
  if (!response.ok) throw new Error("Push subscription failed");
  return true;
}

async function refreshPushSubscription() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    if (state.role === "player") {
      await registerPushSubscription();
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await fetch(platformContext.enabled ? `${PLATFORM_API_BASE}/api/v2/push/subscriptions` : apiUrl("/api/push/unsubscribe"), {
        method: platformContext.enabled ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: platformContext.enabled ? "include" : "same-origin",
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
    }
  } catch (_) {}
}

function applyClubBranding() {
  document.title = `${club.name} | Klubovy portal`;
  const clubNameTitle = document.querySelector("#clubNameTitle");
  if (clubNameTitle) clubNameTitle.textContent = club.name;
  const logo = document.querySelector("#clubLogo");
  if (logo) {
    logo.innerHTML = club.logoUrl
      ? `<img src="${club.logoUrl}" alt="${club.name}">`
      : (club.logoText || club.name.split(/\s+/).map((word) => word[0]).join("").slice(0, 3).toUpperCase());
  }
  const heading = document.querySelector("#clubNameTitle");
  let selector = document.querySelector("#clubSelector");
  if (heading && platformContext.clubs.length > 1) {
    if (!selector) {
      selector = document.createElement("select");
      selector.id = "clubSelector";
      selector.className = "club-selector";
      heading.insertAdjacentElement("afterend", selector);
    }
    selector.innerHTML = platformContext.clubs.map((item) => `<option value="${item.clubId}" ${item.clubId === platformContext.clubId ? "selected" : ""}>${item.name}</option>`).join("");
  } else if (selector) selector.remove();
}

function multiClubAgendaSection() {
  if (!platformContext.enabled || platformContext.clubs.length < 2) return "";
  const items = [
    ...(platformAgenda.reservations || []).map((item) => ({ date: item.reservation_date, start: item.start_time, club: item.club_name, title: `${item.game_type === "single" ? "Dvouhra" : "Ctyrhra"} · ${item.court_name}` })),
    ...(platformAgenda.events || []).map((item) => ({ date: item.event_date, start: item.start_time, club: item.club_name, title: item.title }))
  ].sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)).slice(0, 6);
  return `<section class="section multi-club-agenda"><div class="section-head"><h2>Moje kluby</h2><span class="pill">soukromy prehled</span></div><div class="profile-list">${items.map((item) => `<div class="profile-row"><span><strong>${item.title}</strong><small>${item.club}</small></span><span>${formatPortalDate(dateFromIso(item.date), false)}<small>${item.start}</small></span></div>`).join("") || `<div class="profile-row"><span>Zadne dalsi terminy</span></div>`}</div></section>`;
}

function testAppBadge() {
  try {
    if ("setAppBadge" in navigator) {
      navigator.setAppBadge(Math.max(1, appBadgeCount() || 4));
      showToast("Test odznaku odeslan. Na Androidu se ukaze hlavne u nainstalovane aplikace.");
    } else {
      showToast("Tento prohlizec nepodporuje cislo na ikone PWA.");
    }
  } catch (error) {
    showToast("Telefon odznak zatim nepovolil. Zkus aplikaci nainstalovat na plochu a povolit notifikace.");
  }
}

async function sendAndroidNotificationTest() {
  try {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      showToast("Tento telefon/prohlizec nepodporuje webove notifikace.");
      return;
    }
    let permission = Notification.permission;
    if (permission !== "granted") permission = await Notification.requestPermission();
    if (permission !== "granted") {
      showToast("Notifikace nejsou povolene, Android badge se proto neukaze.");
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const count = Math.max(1, appBadgeCount() || visibleNotifications().length || 4);
    await registration.showNotification(`${club.name}: ${count} zpravy`, {
      body: "Test klubove notifikace. Android z ni muze vytvorit tecku nebo cislo na ikone podle launcheru.",
      icon: "assets/club-logo-dm-192.png",
      badge: "assets/club-logo-dm-192.png",
      tag: `siruch-test-${Date.now()}`,
      renotify: false,
      data: { url: "./index.html" }
    });
    if ("setAppBadge" in navigator) navigator.setAppBadge(count);
    showToast("Testovaci notifikace odeslana. Zkontroluj ikonu aplikace na plose.");
  } catch (error) {
    showToast("Notifikaci se nepodarilo odeslat. Zkus aplikaci spustit z ikony na plose.");
  }
}

function accountByEmail(email = "") {
  const normalized = email.trim().toLowerCase();
  return demoLoginAccounts.find((account) => account.email.toLowerCase() === normalized) ||
    adminPlayerDirectory
      .map((player) => player.email ? ({
        email: player.email,
        password: player.password || `siruch-${player.id}`,
        role: "player",
        persona: player.id,
        label: player.name
      }) : null)
      .filter(Boolean)
      .find((account) => account.email.toLowerCase() === normalized);
}

function requestDemoLoginPassword() {
  const email = document.querySelector("#loginEmailInput")?.value?.trim().toLowerCase();
  const account = accountByEmail(email);
  if (!email || !account) {
    localStorage.removeItem("tennis-demo-login");
    showToast("Tento e-mail neni v testovacich uctech.");
    return false;
  }
  localStorage.setItem("tennis-demo-login", JSON.stringify({ email: account.email, password: account.password, sentAt: Date.now() }));
  return true;
}

async function completeDemoLogin() {
  const email = document.querySelector("#loginEmailInput")?.value?.trim().toLowerCase();
  const password = document.querySelector("#loginPasswordInput")?.value?.trim();
  if (platformContext.enabled) {
    if (!email || !password) {
      lastActionMessage = "Zadej e-mail a heslo.";
      return false;
    }
    try {
      await platformRequest("/api/v2/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      await loadPlatformContext();
      return true;
    } catch (error) {
      lastActionMessage = error.status === 401 ? "E-mail nebo heslo nesedi." : error.message;
      return false;
    }
  }
  const account = accountByEmail(email);
  if (!account || account.password !== password) {
    showToast("E-mail nebo heslo nesedi.");
    return false;
  }
  state.role = account.role;
  state.view = "home";
  if (account.persona) setCurrentPersona(account.persona);
  saveLoginSession(account);
  persistData();
  return true;
}

async function completeLogout() {
  try {
    if (platformContext.enabled) await platformRequest("/api/v2/auth/logout", { method: "POST" });
  } catch (_) {
    // The local session is cleared even if the server session already expired.
  }
  try {
    localStorage.removeItem(LOGIN_SESSION_KEY);
  } catch (_) {}
  platformContext.clubId = "";
  platformContext.membershipId = "";
  platformContext.userId = "";
  platformContext.email = "";
  platformContext.role = "";
  platformContext.membersByPersona.clear();
  state.role = "guest";
  state.view = "home";
  lastActionMessage = "Odhlaseni probehlo.";
  return true;
}

async function changeOwnPassword() {
  if (!platformContext.enabled || !platformContext.userId) {
    lastActionMessage = "Zmena hesla je dostupna po prihlaseni k platforme.";
    return false;
  }
  const currentPassword = document.querySelector("#currentPasswordInput")?.value || "";
  const newPassword = document.querySelector("#newPasswordInput")?.value || "";
  const confirmation = document.querySelector("#confirmPasswordInput")?.value || "";
  if (newPassword.length < 12) {
    lastActionMessage = "Nove heslo musi mit alespon 12 znaku.";
    return false;
  }
  if (newPassword !== confirmation) {
    lastActionMessage = "Nova hesla se neshoduji.";
    return false;
  }
  try {
    await platformRequest("/api/v2/me/password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword })
    });
    await completeLogout();
    lastActionMessage = "Heslo je zmenene. Vsechna zarizeni byla odhlasena; prihlas se novym heslem.";
    return true;
  } catch (error) {
    lastActionMessage = error.code === "invalid_current_password" ? "Soucasne heslo nesedi." : error.message;
    return false;
  }
}

async function saveAdminSettings() {
  const name = document.querySelector("#clubNameInput")?.value?.trim();
  const logoText = document.querySelector("#clubLogoTextInput")?.value?.trim();
  const logoUrl = document.querySelector("#clubLogoUrlInput")?.value?.trim();
  const open = document.querySelector("#clubOpenSettingsInput")?.value?.trim();
  const close = document.querySelector("#clubCloseSettingsInput")?.value?.trim();
  const cancellationMinutes = Number(document.querySelector("#clubCancellationMinutesInput")?.value);
  if (!name || !open || !close || timeToMinutes(close) <= timeToMinutes(open)) {
    lastActionMessage = "Zadej nazev klubu a platnou oteviraci dobu.";
    return false;
  }
  if (!Number.isInteger(cancellationMinutes) || cancellationMinutes < 0 || cancellationMinutes > 10080) {
    lastActionMessage = "Cas na opravu rezervace musi byt cele cislo od 0 do 10080 minut.";
    return false;
  }
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}`, {
        method: "PUT",
        body: JSON.stringify({ name, logoUrl: logoUrl || "", openTime: open, closeTime: close, cancellationMinutes })
      });
      await refreshPlatformReservations();
      lastActionMessage = "Nastaveni klubu je ulozene a platne pro vsechny kurty.";
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  club.name = name;
  club.logoText = logoText || club.logoText || "";
  club.logoUrl = logoUrl || "";
  club.cancellationMinutes = cancellationMinutes;
  if (open && close && timeToMinutes(close) > timeToMinutes(open)) {
    club.open = open;
    club.close = close;
  }
  persistData();
  applyClubBranding();
  return true;
}

function proposalHasPlayer(proposal, playerId = currentPersonaId()) {
  return proposal.ownerId === playerId || proposal.sentTo?.some((player) => (player.playerId || playerRecordByNameOrInitials(player)?.id) === playerId);
}

function visibleGameProposals() {
  const playerId = currentPersonaId();
  return gameProposals.filter((proposal) => proposalHasPlayer(proposal, playerId));
}

function visibleJoinedEvents() {
  const ids = state.joinedEventsByPlayer[currentPersonaId()] || [];
  return ids.map((id) => events.find((event) => event.id === id)).filter((event) => event && event.status !== "cancelled" && !eventHasEnded(event));
}

function eventHasRegisteredPlayer(event, player) {
  const fullName = player.name || "";
  const firstName = fullName.split(" ")[0];
  return event.registered.some((entry) => entry === fullName || entry === firstName || entry.includes(fullName));
}

function registerPlayerForEvent(event, player) {
  const fullName = player.name || "Hrac";
  const firstName = fullName.split(" ")[0];
  const existingIndex = event.registered.findIndex((entry) => entry === fullName || entry === firstName || entry.includes(fullName));
  if (existingIndex >= 0) {
    event.registered[existingIndex] = fullName;
    return false;
  }
  event.registered.push(fullName);
  return true;
}

function eventRecipientIds(event) {
  const ids = new Set();
  (event.registered || []).forEach((name) => {
    const player = playerIdByDisplayName(name);
    if (player) ids.add(player);
  });
  notifications.forEach((item) => {
    if (item.eventId === event.id) (item.recipients || []).forEach((id) => ids.add(id));
  });
  Object.entries(state.joinedEventsByPlayer || {}).forEach(([playerId, eventIds]) => {
    if ((eventIds || []).includes(event.id)) ids.add(playerId);
  });
  return [...ids].filter((id) => playerRecordById(id));
}

function notifyPlayersAboutEvent(event, mode = "created", reason = "", recipientsOverride = null) {
  const recipients = recipientsOverride || (mode === "cancelled" ? eventRecipientIds(event) : players.map((player) => player.id));
  const type = mode === "cancelled" ? "event-cancelled" : "event-announcement";
  notifications.splice(0, notifications.length, ...notifications.filter((item) =>
    !(item.eventId === event.id && item.type === type)
  ));
  recipients.forEach((id) => notifications.push({
    id: `${type}-${event.id}-${Date.now()}-${id}`,
    type,
    recipients: [id],
    title: mode === "cancelled" ? "Akce zrusena" : "Nova klubova akce",
    meta: mode === "cancelled"
      ? `${event.title} (${event.meta}) je zrusena. Duvod: ${reason || "spravce doplni duvod"}`
      : `${event.title} - ${event.meta}. Otevri detail a prihlas se, pokud chces jit.`,
    status: mode === "cancelled" ? "Omluva od klubu" : "Nova akce",
    eventId: event.id
  }));
}

function pollById(pollId = "") {
  return clubPolls.find((poll) => poll.id === pollId) || clubPolls[0];
}

function pollOptionById(poll, optionId = "") {
  return poll?.options?.find((option) => option.id === optionId) || poll?.options?.[0];
}

function pollTotalVotes(poll) {
  return (poll?.options || []).reduce((sum, option) => sum + (option.votes || []).length, 0);
}

function pollWinner(poll) {
  return [...(poll?.options || [])].sort((a, b) =>
    (b.weighted || 0) - (a.weighted || 0) || (b.votes || []).length - (a.votes || []).length
  )[0];
}

function pollHasVoted(poll, playerId = currentPersonaId()) {
  return (poll?.options || []).some((option) => (option.votes || []).includes(playerId));
}

async function voteInPoll(pollId = "", optionId = "") {
  const poll = pollById(pollId);
  const option = pollOptionById(poll, optionId);
  const playerId = currentPersonaId();
  if (!poll || !option || poll.status !== "active") return false;
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/polls/${poll.id}/vote`, {
        method: "POST", body: JSON.stringify({ optionId: option.id })
      });
      await Promise.all([refreshPlatformPolls(), refreshPlatformReservations()]);
      lastActionMessage = "Hlas v ankete je ulozeny.";
      return true;
    } catch (error) { lastActionMessage = error.message; return false; }
  }
  poll.options.forEach((item) => {
    item.votes = (item.votes || []).filter((id) => id !== playerId);
  });
  option.votes = option.votes || [];
  option.votes.push(playerId);
  const player = playerRecordById(playerId) || currentUser;
  option.weighted = (option.weighted || 0) + (player.seasonSpend > 6000 || player.playedHours > 80 ? 3 : 1);
  notifications.splice(0, notifications.length, ...notifications.filter((item) =>
    !(item.type === "poll" && item.pollId === poll.id && item.recipients?.includes(playerId))
  ));
  persistData();
  return true;
}

async function remindPollVoters(pollId = "") {
  const poll = pollById(pollId);
  if (!poll || poll.status !== "active") return false;
  if (platformContext.enabled) {
    try {
      const result = await platformRequest(`/api/v2/clubs/${platformContext.clubId}/polls/${poll.id}/remind`, { method: "POST" });
      lastActionMessage = `Pripominka odeslana ${result.notified || 0} nehlasujicim hracum.`;
      return true;
    } catch (error) { lastActionMessage = error.message; return false; }
  }
  const recipients = players
    .map((player) => player.id)
    .filter((id) => !pollHasVoted(poll, id));
  recipients.forEach((id) => notifications.push({
    id: `poll-reminder-${poll.id}-${Date.now()}-${id}`,
    type: "poll",
    recipients: [id],
    title: "Anketa klubu",
    meta: `${poll.title} Hlasuj do ${poll.end}, zabere to par vterin.`,
    status: "ceka na hlas",
    pollId: poll.id
  }));
  persistData();
  return true;
}

async function createPollFromModal() {
  const title = document.querySelector("#pollTitleInput")?.value?.trim() || "Co chcete otestovat na kurtech?";
  const end = document.querySelector("#pollEndInput")?.value?.trim() || "za 3 dny";
  const rawOptions = document.querySelector("#pollOptionsInput")?.value || "A - rakety Babolat\nB - rakety Wilson\nC - boty Wilson\nD - tricka Nike / Puma";
  const options = rawOptions.split("\n").map((line, index) => line.trim()).filter(Boolean).map((label, index) => ({
    id: `option-${Date.now()}-${index}`,
    label,
    category: label.toLowerCase().includes("bot") ? "boty" : label.toLowerCase().includes("trick") ? "obleceni" : "rakety",
    votes: [],
    weighted: 0,
    logistics: "domluvit s dodavatelem podle vysledku"
  }));
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/polls`, {
        method: "POST",
        body: JSON.stringify({ title, question: "Vyber, o co mas zajem pri dalsi testovaci akci klubu.", endsAt: end, options: options.map((option) => option.label) })
      });
      await refreshPlatformPolls();
      lastActionMessage = "Anketa je sdilena vsem hracum klubu.";
      return true;
    } catch (error) { lastActionMessage = error.message; return false; }
  }
  const poll = {
    id: `poll-${Date.now()}`,
    title,
    question: "Vyber, o co mas zajem pri dalsi testovaci akci klubu.",
    status: "active",
    start: "dnes",
    end,
    reminder: "push 1x denne hracum bez hlasu",
    options,
    supplierNote: "Po ukonceni spravce domluvi dodavatele podle vysledku.",
    cadence: "Drzet rozumnou frekvenci, aby akce nezevsednely.",
    createdEventId: ""
  };
  clubPolls.unshift(poll);
  remindPollVoters(poll.id);
  persistData();
  return true;
}

async function closePollToEvent(pollId = "") {
  const poll = pollById(pollId);
  const winner = pollWinner(poll);
  if (!poll || !winner) return false;
  if (platformContext.enabled) {
    try {
      try {
        await platformRequest(`/api/v2/clubs/${platformContext.clubId}/polls/${poll.id}/close`, { method: "POST" });
      } catch (error) {
        if (error.code !== "poll_not_active") throw error;
      }
      const date = document.querySelector("#pollEventDateInput")?.value || dateInputValue(nextTournamentSaturday());
      const start = document.querySelector("#pollEventStartInput")?.value || "10:00";
      const end = document.querySelector("#pollEventEndInput")?.value || "14:00";
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/polls/${poll.id}/supplier-request`, {
        method: "POST",
        body: JSON.stringify({ date, start, end, title: `Testovani: ${winner.label.replace(/^[A-D]\s*-\s*/i, "")}` })
      });
      await Promise.all([refreshPlatformPolls(), refreshPlatformSupplierRequests(), refreshPlatformReservations()]);
      lastActionMessage = `Anketa je uzavrena. Navrh akce pro ${winner.label} dostal obchodnik.`;
      return true;
    } catch (error) { lastActionMessage = error.message; return false; }
  }
  poll.status = "closed";
  const event = {
    id: `poll-event-${Date.now()}`,
    thumbnail: winner.category === "boty" ? "shoes" : winner.category === "obleceni" ? "shop" : "rackets",
    status: "waiting_for_seller",
    sourcePollId: poll.id,
    sellerStatus: "ceka na potvrzeni obchodnika",
    sellerDelivery: "",
    sellerNote: "",
    requestedDate: "So 22.6. 10:00-14:00",
    date: "So",
    title: `Testovani: ${winner.label.replace(/^[A-D]\s*-\s*/, "")}`,
    meta: `Navazano na anketu ${poll.end} · ${pollTotalVotes(poll)} hlasu`,
    detail: `Akce vznikla z ankety "${poll.title}". Dodavatel ma pripravit: ${winner.logistics}. ${poll.supplierNote}`,
    fee: "Zdarma / club deal",
    registered: [],
    history: `Vitez ankety: ${winner.label}, vaha ${winner.weighted}, hlasy ${(winner.votes || []).length}.`
  };
  events.unshift(event);
  poll.createdEventId = event.id;
  persistData();
  return true;
}

function publicEvents() {
  return events.filter((event) => (!event.status || event.status === "published") && !eventHasEnded(event));
}

function archivedEvents() {
  return events.filter((event) => event.status !== "cancelled" && eventHasEnded(event));
}

function sellerEvents() {
  return events.filter((event) => ["waiting_for_seller", "seller_counterproposal", "seller_confirmed"].includes(event.status));
}

async function requestSellerApproval(eventId = "") {
  const event = events.find((item) => item.id === eventId);
  if (!event) return false;
  event.status = "waiting_for_seller";
  event.sellerStatus = "odeslano obchodnikovi";
  persistData();
  return true;
}

async function sellerConfirmEvent(eventId = "") {
  const event = events.find((item) => item.id === eventId);
  if (!event) return false;
  const date = document.querySelector("#sellerEventDateInput")?.value?.trim() || event.requestedDate || event.meta;
  const delivery = document.querySelector("#sellerDeliveryInput")?.value?.trim() || "demo sada podle vysledku ankety";
  const note = document.querySelector("#sellerNoteInput")?.value?.trim() || "Termin potvrzen, zbozi lze dodat na klub pred akci.";
  const confirmedDate = document.querySelector("#sellerEventDateInput")?.value || event.isoDate;
  const confirmedStart = document.querySelector("#sellerEventStartInput")?.value || event.startTime;
  const confirmedEnd = document.querySelector("#sellerEventEndInput")?.value || event.endTime;
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/supplier-requests/${event.supplierRequestId}/respond`, {
        method: "PUT", body: JSON.stringify({ response: "confirm", items: delivery, note, date: confirmedDate, start: confirmedStart, end: confirmedEnd })
      });
      await refreshPlatformSupplierRequests();
      lastActionMessage = "Termin a obsah dodavky jsou potvrzene spravci.";
      return true;
    } catch (error) { lastActionMessage = error.message; return false; }
  }
  event.requestedDate = date;
  event.meta = date;
  event.sellerDelivery = delivery;
  event.sellerNote = note;
  event.sellerStatus = "obchodnik potvrdil termin a dodavku";
  event.status = "seller_confirmed";
  persistData();
  return true;
}

async function publishApprovedEvent(eventId = "") {
  const event = events.find((item) => item.id === eventId);
  if (!event || event.status !== "seller_confirmed") return false;
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/supplier-requests/${event.supplierRequestId}/publish`, { method: "POST" });
      await Promise.all([refreshPlatformEvents(), refreshPlatformSupplierRequests(), refreshPlatformReservations()]);
      lastActionMessage = "Akce je publikovana hracum a prislo jim oznameni.";
      return true;
    } catch (error) { lastActionMessage = error.message; return false; }
  }
  event.status = "published";
  event.sellerStatus = "publikovano hracum";
  notifyPlayersAboutEvent(event, "created");
  persistData();
  return true;
}

async function cancelAdminEvent(eventId = "") {
  const event = events.find((item) => item.id === eventId);
  if (!event) return false;
  const reason = document.querySelector("#adminEventCancelReasonInput")?.value?.trim() || "Nedostatek ucastniku nebo organizacni duvody.";
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/events/${eventId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason })
      });
      await Promise.all([refreshPlatformEvents(), refreshPlatformReservations()]);
      lastActionMessage = `${event.title} je zrusena a prihlaseni hraci dostali duvod.`;
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  const cancelRecipients = eventRecipientIds(event);
  event.status = "cancelled";
  event.cancelReason = reason;
  event.cancelledAt = new Date().toISOString();
  event.registered = [];
  Object.keys(state.joinedEventsByPlayer || {}).forEach((playerId) => {
    state.joinedEventsByPlayer[playerId] = (state.joinedEventsByPlayer[playerId] || []).filter((id) => id !== event.id);
  });
  state.joinedEvents.delete(event.id);
  notifications.splice(0, notifications.length, ...notifications.filter((item) =>
    !(item.eventId === event.id && ["event-invite", "event-announcement"].includes(item.type))
  ));
  notifyPlayersAboutEvent(event, "cancelled", reason, cancelRecipients);
  persistData();
  return true;
}

function tournamentById(id = "") {
  return tournaments.find((item) => item.id === id) || tournaments[0];
}

async function createSingleTournamentFromModal() {
  const title = document.querySelector("#tournamentTitleInput")?.value?.trim() || "Novy single turnaj";
  const startDate = dateFromDateInput(document.querySelector("#tournamentDateInput")?.value || dateInputValue(nextTournamentSaturday()));
  const startTime = document.querySelector("#tournamentStartTimeInput")?.value || "9:00";
  const deadlineDate = dateFromDateInput(document.querySelector("#tournamentDeadlineInput")?.value || dateInputValue(startDate));
  const deadlineTime = document.querySelector("#tournamentDeadlineTimeInput")?.value || "20:00";
  const date = `${formatPortalDate(startDate)} ${startTime}`;
  const deadline = `${formatPortalDate(deadlineDate)} ${deadlineTime}`;
  const maxPlayers = Number(document.querySelector("#tournamentMaxInput")?.value || 16);
  const tournamentType = document.querySelector("#tournamentTypeInput")?.value === "double" ? "double" : "single";
  const entryFeeAmount = Number(document.querySelector("#tournamentFeeInput")?.value || 0);
  if (!Number.isFinite(entryFeeAmount) || entryFeeAmount < 0) {
    lastActionMessage = "Startovne musi byt nula nebo kladna castka.";
    return false;
  }
  const entryFeeLabel = entryFeeAmount > 0 ? `${entryFeeAmount} Kc` : "Zdarma";
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/tournaments`, {
        method: "POST",
        body: JSON.stringify({
          title,
          type: tournamentType,
          date: dateToIso(startDate),
          start: startTime,
          deadline: `${dateToIso(deadlineDate)}T${deadlineTime}`,
          maxParticipants: maxPlayers,
          courtIds: courts.slice(0, 3).map((court) => court.id),
          entryFeeLabel,
          rules: "Skupiny kazdy s kazdym, potom pavouk."
        })
      });
      await refreshPlatformTournaments();
      lastActionMessage = `${tournamentType === "double" ? "Double" : "Single"} turnaj je vytvoreny a hraci dostali oznameni.`;
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  tournaments.unshift({
    id: `single-${Date.now()}`,
    title,
    type: tournamentType,
    status: "registration",
    date,
    isoDate: dateToIso(startDate),
    deadline,
    courts: courts.slice(0, 3).map((court) => court.name),
    maxPlayers,
    entryFee: entryFeeLabel,
    rules: "Skupiny kazdy s kazdym, potom pavouk.",
    participants: [],
    groups: [],
    matches: [],
    knockout: [],
    history: ""
  });
  persistData();
  return true;
}

async function toggleTournamentRegistration(tournamentId = "") {
  const tournament = tournamentById(tournamentId);
  if (!tournament || tournament.status !== "registration" || state.role !== "player") return false;
  if (platformContext.enabled) {
    try {
      const partnerMembershipId = document.querySelector("#tournamentPartnerInput")?.value || "";
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/tournaments/${tournamentId}/register`, { method: tournament.isRegistered ? "DELETE" : "POST", body: tournament.isRegistered ? undefined : JSON.stringify({ partnerMembershipId }) });
      await refreshPlatformTournaments();
      lastActionMessage = tournament.isRegistered ? "Z turnaje ses odhlasil." : "Prihlaseni na turnaj je potvrzeno.";
      return true;
    } catch (error) {
      lastActionMessage = error.code === "tournament_full" ? "Turnaj je uz plny." : error.message;
      return false;
    }
  }
  const name = currentUser.name.split(" ")[0];
  const index = tournament.participants.indexOf(name);
  if (index >= 0) {
    tournament.participants.splice(index, 1);
    lastActionMessage = "Z turnaje ses odhlasil.";
  } else {
    if (tournament.participants.length >= tournament.maxPlayers) {
      lastActionMessage = "Turnaj je uz plny.";
      return false;
    }
    tournament.participants.push(name);
    lastActionMessage = "Prihlaseni na turnaj je potvrzeno.";
  }
  persistData();
  return true;
}

function groupName(index) {
  return String.fromCharCode(65 + index);
}

async function generateTournamentGroups(tournamentId = "") {
  const tournament = tournamentById(tournamentId);
  if (!tournament) return false;
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/tournaments/${tournamentId}/draw`, { method: "POST" });
      await refreshPlatformTournaments();
      lastActionMessage = "Prihlasky jsou uzavrene a skupiny vylosovane.";
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  const playersList = [...tournament.participants];
  const groupCount = Math.max(1, Math.min(tournament.courts.length || 1, Math.ceil(playersList.length / 4)));
  const groups = Array.from({ length: groupCount }, (_, index) => ({ name: groupName(index), players: [], table: [] }));
  playersList.forEach((player, index) => groups[index % groupCount].players.push(player));
  const matches = [];
  groups.forEach((group) => {
    group.table = group.players.map((player) => ({ player, points: 0, wins: 0, losses: 0, score: "0:0" }));
    for (let i = 0; i < group.players.length; i += 1) {
      for (let j = i + 1; j < group.players.length; j += 1) {
        matches.push({
          id: `match-${tournament.id}-${group.name}-${i}-${j}`,
          stage: "group",
          group: group.name,
          court: tournament.courts[matches.length % tournament.courts.length] || "Kurt 1",
          time: minutesToTime(timeToMinutes("9:00") + matches.length * 45),
          playerA: group.players[i],
          playerB: group.players[j],
          score: "",
          winner: ""
        });
      }
    }
  });
  tournament.groups = groups;
  tournament.matches = matches;
  tournament.knockout = [];
  tournament.status = "groups";
  persistData();
  return true;
}

async function recordDemoTournamentResults(tournamentId = "") {
  const tournament = tournamentById(tournamentId);
  if (!tournament?.matches?.length) return false;
  if (platformContext.enabled) {
    try {
      for (const [index, match] of tournament.matches.filter((item) => item.stage === "group" && !item.score).entries()) {
        await platformRequest(`/api/v2/clubs/${platformContext.clubId}/tournaments/${tournamentId}/matches/${match.id}`, {
          method: "PUT",
          body: JSON.stringify(tournament.type === "double"
            ? { score: index % 2 ? "6:4" : "7:5", winnerTeamId: index % 3 === 0 ? match.teamBId : match.teamAId }
            : { score: index % 2 ? "6:4" : "7:5", winnerMembershipId: index % 3 === 0 ? match.playerBMembershipId : match.playerAMembershipId })
        });
      }
      await refreshPlatformTournaments();
      lastActionMessage = "Vysledky skupin jsou ulozene pro vsechny hrace.";
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  tournament.matches.filter((match) => match.stage === "group").forEach((match, index) => {
    match.score = index % 2 ? "6:4" : "7:5";
    match.winner = index % 3 === 0 ? match.playerB : match.playerA;
  });
  tournament.groups.forEach((group) => {
    group.table = group.players.map((player) => {
      const played = tournament.matches.filter((match) => match.group === group.name && (match.playerA === player || match.playerB === player));
      const wins = played.filter((match) => match.winner === player).length;
      return { player, points: wins * 2, wins, losses: played.length - wins, score: `${wins}:${played.length - wins}` };
    }).sort((a, b) => b.points - a.points || b.wins - a.wins);
  });
  persistData();
  return true;
}

async function generateTournamentKnockout(tournamentId = "") {
  const tournament = tournamentById(tournamentId);
  if (!tournament?.groups?.length) return false;
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/tournaments/${tournamentId}/knockout`, { method: "POST" });
      await refreshPlatformTournaments();
      lastActionMessage = "Pavouk je vytvoreny podle vysledku skupin.";
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  const qualified = tournament.groups.flatMap((group) => group.table.slice(0, 2).map((row) => row.player));
  const bracket = [];
  for (let i = 0; i < qualified.length; i += 2) {
    bracket.push({
      id: `ko-${tournament.id}-${i}`,
      stage: qualified.length > 4 ? "ctvrtfinale" : "semifinale",
      playerA: qualified[i],
      playerB: qualified[i + 1] || "volny los",
      score: "",
      winner: ""
    });
  }
  tournament.knockout = bracket;
  tournament.status = "knockout";
  persistData();
  return true;
}

async function archiveTournament(tournamentId = "") {
  const tournament = tournamentById(tournamentId);
  if (!tournament) return false;
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/tournaments/${tournamentId}/archive`, { method: "POST" });
      await refreshPlatformTournaments();
      lastActionMessage = "Turnaj je ulozeny do archivu.";
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  tournament.status = "archived";
  tournament.history = `Archiv: ${tournament.title}, ${tournament.participants.length} hracu, skupiny ${tournament.groups.length}, pavouk ${tournament.knockout.length} zapasu.`;
  persistData();
  return true;
}

async function joinEventForPlayer(eventId, playerId = currentPersonaId()) {
  const event = events.find((item) => item.id === eventId);
  const player = playerRecordById(playerId) || currentPlayerRecord();
  if (!event || !player) return false;
  if (platformContext.enabled && playerId === currentPersonaId()) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/events/${eventId}/register`, { method: "POST" });
      await Promise.all([refreshPlatformEvents(), refreshPlatformReservations()]);
      lastActionMessage = `${event.title} je pridana do tveho kalendare.`;
      return true;
    } catch (error) {
      lastActionMessage = error.code === "event_full" ? "Akce je uz plna." : error.message;
      return false;
    }
  }
  state.joinedEventsByPlayer[playerId] = state.joinedEventsByPlayer[playerId] || [];
  if (!state.joinedEventsByPlayer[playerId].includes(eventId)) state.joinedEventsByPlayer[playerId].push(eventId);
  if (playerId === currentPersonaId()) state.joinedEvents.add(eventId);
  registerPlayerForEvent(event, player);
  notifications.splice(0, notifications.length, ...notifications.filter((item) =>
    !(item.eventId === eventId && item.recipients?.includes(playerId) && ["event-announcement", "event-invite"].includes(item.type))
  ));
  return true;
}

function currentPlayerRecord() {
  return playerRecordById(currentPersonaId()) || currentUser;
}

function orderPlayerId(order) {
  if (order.playerId) return order.playerId;
  return playerRecordByNameOrInitials({ name: order.player })?.id;
}

function visiblePlayerOrders(playerId = currentPersonaId()) {
  return playerOrders.filter((order) => orderPlayerId(order) === playerId);
}

function visibleStringingOrders(playerId = currentPersonaId()) {
  return stringingOrders.filter((order) => order.playerId === playerId);
}

function isStringingProduct(product = "") {
  return product.toLowerCase().includes("vyplet");
}

function stringingReadyMessage(order) {
  return `Vyplet je hotovy, muzete si raketu vyzvednout pred hrou ${order.reservation} na recepci.`;
}

function createStringingOrderFromProduct(baseOrder, reservation) {
  const stringingOrder = {
    id: `stringing-${Date.now()}-${baseOrder.playerId}`,
    player: baseOrder.player,
    playerId: baseOrder.playerId,
    racket: "Moje hlavni raketa",
    string: "doporuceny vyplet",
    tension: "doporuci vypletac",
    status: "waiting_dropoff",
    statusLabel: "ceka na predani rakety",
    reservation: baseOrder.reservation,
    handoff: baseOrder.deliveryMode === "reservation" ? "po hre na recepci" : "recepce",
    due: reservation ? `${reservationDateLabel(reservation)} pred dalsi hrou` : baseOrder.reservation,
    note: baseOrder.note || "Hrac chce rychle doporuceni.",
    message: ""
  };
  stringingOrders.unshift(stringingOrder);
  notifications.push({
    id: `stringing-dropoff-${stringingOrder.id}`,
    type: "stringing",
    recipients: [baseOrder.playerId],
    title: "Vyplet rakety",
    meta: `Nech raketu ${stringingOrder.handoff}. Vypletac dostal pozadavek automaticky.`,
    status: "ceka na predani",
    stringingId: stringingOrder.id
  });
  return stringingOrder;
}

async function advanceStringingOrder(orderId, nextStatus) {
  const order = stringingOrders.find((item) => item.id === orderId);
  if (!order) return false;
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/stringing-jobs/${orderId}/transition`, {
        method: "POST",
        body: JSON.stringify({ status: nextStatus })
      });
      await Promise.all([refreshPlatformStringing(), refreshPlatformOrders(), refreshPlatformReservations()]);
      lastActionMessage = "Stav vypletu byl sdilen se vsemi zapojenymi.";
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  const labels = {
    with_stringer: "u vypletace",
    done: "vypleteno",
    ready_for_pickup: "hotovo na recepci",
    returned_to_club: "vraceno klubu",
    delivered: "prevzato hracem od klubu"
  };
  order.status = nextStatus;
  order.statusLabel = labels[nextStatus] || order.statusLabel;
  if (nextStatus === "ready_for_pickup" || nextStatus === "done") {
    order.message = stringingReadyMessage(order);
    notifications.splice(0, notifications.length, ...notifications.filter((item) => item.stringingId !== order.id || item.type !== "stringing-ready"));
    notifications.push({
      id: `stringing-ready-${order.id}`,
      type: "stringing-ready",
      recipients: [order.playerId],
      title: "Vyplet je hotovy",
      meta: order.message,
      status: "k vyzvednuti",
      stringingId: order.id
    });
  }
  persistData();
  return true;
}

function orderDeliveryLabel(order) {
  if (order.deliveryMode === "reservation") return `pripravit k rezervaci ${order.reservation}`;
  if (order.deliveryMode === "event") return `pripravit na akci ${order.eventTitle || "klubova akce"}`;
  return `vyzvednuti na klubu ${order.pickupDate || order.reservation || "dle dohody"}`;
}

function reservationOrders(reservation, playerId = currentPersonaId()) {
  const key = `${reservationDateLabel(reservation)} ${reservation.start}`;
  return visiblePlayerOrders(playerId).filter((order) =>
    order.deliveryMode === "reservation" &&
    (order.reservation === key || order.reservation?.includes(reservation.start) || order.reservationIndex === personalReservations.indexOf(reservation))
  );
}

function reservationById(reservationId) {
  return personalReservations.find((reservation) => reservation.id === reservationId);
}

function courtReservationById(reservationId) {
  for (const court of courts) {
    const reservation = court.reservations.find((item) => item.reservationId === reservationId);
    if (reservation) return { court, reservation };
  }
  return null;
}

function bookingDateForSelectedDay() {
  return String(selectedBookingDateObject().getDate());
}

function bookingDayNameForSelectedDay() {
  return new Intl.DateTimeFormat("cs-CZ", { weekday: "long" }).format(selectedBookingDateObject());
}

function reservationDateLabel(reservation) {
  const date = dateFromIso(reservationIsoDate(reservation));
  return date ? formatPortalDate(date) : `${fullDayName(reservation.day)} ${reservation.date}`;
}

function reservationTimeLabel(reservation) {
  return `${reservationDateLabel(reservation)} ${reservation.start}-${reservation.end}`;
}

function courtFromBookingValue(value = "") {
  return courts.find((court) => court.id === value || court.name === value || value.includes(court.name)) || courts[0];
}

function bookingOverlaps(court, start, end) {
  return courtReservations(court).some((reservation) =>
    timeToMinutes(reservation.end) > timeToMinutes(start) &&
    timeToMinutes(reservation.start) < timeToMinutes(end)
  );
}

async function createBookingReservation() {
  lastActionMessage = "";
  const court = courtFromBookingValue(document.querySelector("#bookingCourtInput")?.value);
  const start = document.querySelector("#bookingStartInput")?.value || club.open;
  const duration = Number(document.querySelector("#bookingDurationInput")?.value || 90);
  const end = minutesToTime(Math.min(timeToMinutes(club.close), timeToMinutes(start) + duration));
  const gameType = document.querySelector("#bookingGameTypeInput")?.value || "single";
  const partnerId = document.querySelector("#bookingPartnerInput")?.value || "";
  const partnerMode = document.querySelector("#bookingPartnerModeInput")?.value || "invite";
  const selectedDate = selectedBookingDateObject();
  const isoDate = dateToIso(selectedDate);
  const day = weekdayCodes[selectedDate.getDay()];
  const date = bookingDateForSelectedDay();
  if (!court || timeToMinutes(end) <= timeToMinutes(start)) {
    lastActionMessage = "Zvol platny kurt, zacatek a delku rezervace.";
    return false;
  }
  if (bookingOverlaps(court, start, end)) {
    lastActionMessage = "Kurt je v tomto case uz obsazeny. Vyber jiny cas nebo kurt.";
    return false;
  }
  if (playerHasTimeCollision(currentPersonaId(), day, isoDate, start, end)) {
    lastActionMessage = "V tomto case uz mas jinou rezervaci.";
    return false;
  }
  if (partnerId && playerHasTimeCollision(partnerId, day, isoDate, start, end)) {
    lastActionMessage = `${playerRecordById(partnerId)?.name || "Spoluhrac"} uz v tomto case hraje. Vyber jiny termin.`;
    return false;
  }
  if (platformContext.enabled) {
    const participantMembershipIds = partnerId ? [platformContext.membersByPersona.get(partnerId)].filter(Boolean) : [];
    if (partnerId && !participantMembershipIds.length) {
      lastActionMessage = "Vybrany spoluhrac nema aktivni clenstvi v tomto klubu.";
      return false;
    }
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/reservations`, {
        method: "POST",
        body: JSON.stringify({
          courtId: court.id,
          date: isoDate,
          start,
          end,
          gameType,
          participantMembershipIds,
          participantMode: partnerMode === "confirmed" ? "confirmed" : "pending"
        })
      });
      await refreshPlatformReservations();
      lastActionMessage = partnerId && partnerMode === "invite"
        ? "Rezervace je ulozena a spoluhrac dostal pozvanku."
        : "Rezervace je ulozena v klubovem rozvrhu.";
      return true;
    } catch (error) {
      lastActionMessage = error.code === "booking_conflict" ? "Kurt nebo nektery hrac uz je v tomto case obsazeny." : error.message;
      return false;
    }
  }
  const owner = currentPlayerRecord();
  const reservationId = `reservation-${Date.now()}-${currentPersonaId()}`;
  const attendance = [attendanceFromPlayerId(currentPersonaId(), "active", "vytvoril rezervaci")];
  if (partnerId) {
    attendance.push(attendanceFromPlayerId(
      partnerId,
      partnerMode === "confirmed" ? "confirmed" : "pending",
      partnerMode === "confirmed" ? "jde rovnou" : "ceka na potvrzeni"
    ));
  }
  const target = gameType === "single" ? 2 : 4;
  const bookingType = partnerId && partnerMode === "invite" ? "pending" : attendance.filter(activeForGame).length >= target ? "mine" : "group";
  const createdAt = new Date().toISOString();
  const reservation = {
    id: reservationId,
    ownerId: currentPersonaId(),
    createdAt,
    canEditParticipants: true,
    canCancel: Number(club.cancellationMinutes) > 0,
    canCancelUntil: new Date(new Date(createdAt).getTime() + Number(club.cancellationMinutes) * 60000).toISOString(),
    isoDate,
    day,
    date,
    start,
    end,
    kind: "Jednorazova",
    gameType,
    court,
    players: attendance.map((player) => player.name),
    attendance
  };
  personalReservations.unshift(reservation);
  court.reservations.push({
    isoDate,
    start,
    end,
    title: bookingType === "pending" ? "Ceka na spoluhrace" : gameType === "single" ? "Dvouhra" : "Ctyrhra",
    type: bookingType,
    reservationId,
    players: attendance.map((player) => player.name)
  });
  court.reservations.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  adminReservations.unshift({
    time: `${formatPortalDate(selectedDate)} ${start}-${end}`,
    court: court.name,
    surface: court.surface,
    owner: owner.name,
    status: bookingType === "pending" ? "Ceka na potvrzeni spoluhrace" : "Zapsano",
    players: `${attendance.filter(activeForGame).length}/${target}`,
    tone: bookingType === "pending" ? "warn" : "good",
    reservationId
  });
  if (partnerId && partnerMode === "invite") {
    const dateLabel = reservationTimeLabel(reservation);
    notifications.push({
      id: `booking-invite-${reservationId}-${partnerId}`,
      type: "booking-invite",
      recipients: [partnerId],
      title: "Pozvanka k rezervaci",
      meta: `${owner.name} te zve: ${dateLabel}, ${court.name}`,
      status: "Ceka na potvrzeni",
      reservationId
    });
  }
  persistData();
  return true;
}

function adminBookingPlayers() {
  return players.filter((player) => player.clubRole === "player" && platformContext.membersByPersona.get(player.id));
}

async function createAdminBooking(recurring = false) {
  if (!platformContext.enabled || state.role !== "admin") {
    lastActionMessage = "Rucni rezervace spravce vyzaduje klubove API.";
    return false;
  }
  const ownerPersona = document.querySelector("#adminBookingOwnerInput")?.value || "";
  const ownerMembershipId = platformContext.membersByPersona.get(ownerPersona);
  const participantMembershipIds = [...new Set([1, 2, 3]
    .map((index) => document.querySelector(`#adminBookingPartner${index}Input`)?.value || "")
    .filter((persona) => persona && persona !== ownerPersona)
    .map((persona) => platformContext.membersByPersona.get(persona))
    .filter(Boolean))];
  if (!ownerMembershipId) {
    lastActionMessage = "Vyber aktivniho hrace jako vlastnika rezervace.";
    return false;
  }
  const body = {
    courtId: document.querySelector("#adminBookingCourtInput")?.value || courts[0]?.id,
    ownerMembershipId,
    participantMembershipIds,
    start: document.querySelector("#adminBookingStartInput")?.value || "17:00",
    end: document.querySelector("#adminBookingEndInput")?.value || "19:00",
    gameType: document.querySelector("#adminBookingGameInput")?.value || "double",
    title: document.querySelector("#adminBookingTitleInput")?.value?.trim() || (recurring ? "Trvala rezervace" : "Rucni rezervace"),
    participantMode: "confirmed"
  };
  if (recurring) {
    body.startDate = document.querySelector("#adminBookingDateInput")?.value || selectedBookingIsoDate();
    body.endDate = document.querySelector("#adminBookingSeriesEndInput")?.value || body.startDate;
  } else {
    body.date = document.querySelector("#adminBookingDateInput")?.value || selectedBookingIsoDate();
  }
  try {
    const result = await platformRequest(`/api/v2/clubs/${platformContext.clubId}/${recurring ? "reservation-series" : "reservations"}`, {
      method: "POST", body: JSON.stringify(body)
    });
    await Promise.all([refreshPlatformReservations(), recurring ? refreshPlatformReservationSeries() : Promise.resolve(false)]);
    lastActionMessage = recurring
      ? `Trvala rezervace je ulozena. Vytvoreno ${result.series?.occurrences || 0} terminu.`
      : "Jednorazova rezervace je ulozena do rozvrhu i hracum.";
    return true;
  } catch (error) {
    lastActionMessage = error.code === "booking_conflict" ? "Nektery termin koliduje s kurtem nebo hracem. Serie se nevytvorila ani castecne." : error.message;
    return false;
  }
}

async function cancelAdminReservationSeries(seriesId = "") {
  const from = document.querySelector("#adminSeriesCancelFromInput")?.value || selectedBookingIsoDate();
  try {
    const result = await platformRequest(`/api/v2/clubs/${platformContext.clubId}/reservation-series/${seriesId}?from=${encodeURIComponent(from)}`, { method: "DELETE" });
    await Promise.all([refreshPlatformReservations(), refreshPlatformReservationSeries()]);
    lastActionMessage = `Ukonceno ${result.cancelledOccurrences || 0} budoucich terminu serie.`;
    return true;
  } catch (error) {
    lastActionMessage = error.message;
    return false;
  }
}

function updateBookingReservationState(reservationId, partnerId, status) {
  const reservation = reservationById(reservationId);
  if (!reservation?.attendance) return false;
  const me = reservation.attendance.find((player) => normalizeAttendancePlayer(player).playerId === partnerId);
  if (!me) return false;
  me.status = status;
  me.role = status === "confirmed" ? "potvrdil rezervaci" : "odmitl rezervaci";
  const linked = courtReservationById(reservationId);
  const activeCount = normalizedAttendance(reservation).filter(activeForGame).length;
  const target = reservationTargetPlayers(reservation);
  if (linked) {
    linked.reservation.type = status === "confirmed" && activeCount >= target ? "mine" : status === "declined" ? "group" : "pending";
    linked.reservation.title = status === "confirmed" ? (reservation.gameType === "single" ? "Dvouhra potvrzena" : "Ctyrhra potvrzena") : status === "declined" ? "Hleda spoluhrace" : "Ceka na spoluhrace";
  }
  const admin = adminReservations.find((item) => item.reservationId === reservationId);
  if (admin) {
    admin.status = status === "confirmed" ? "Potvrzeno" : "Spoluhrac odmitl";
    admin.players = `${activeCount}/${target}`;
    admin.tone = status === "confirmed" ? "good" : "warn";
  }
  notifications.splice(0, notifications.length, ...notifications.filter((item) => !(item.reservationId === reservationId && item.recipients?.includes(partnerId))));
  if (status === "declined") {
    const reservationIndex = personalReservations.findIndex((item) => item.id === reservationId);
    if (reservationIndex >= 0) startReplacementVote(reservationIndex, partnerId);
  }
  persistData();
  return true;
}

async function acceptBookingInvite(notificationId = "") {
  const item = notifications.find((entry) => entry.id === notificationId) || notifications.find((entry) => entry.type === "booking-invite" && entry.recipients?.includes(currentPersonaId()));
  if (!item) return false;
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/reservations/${item.reservationId}/respond`, {
        method: "POST",
        body: JSON.stringify({ response: "accept" })
      });
      await refreshPlatformReservations();
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  return updateBookingReservationState(item.reservationId, currentPersonaId(), "confirmed");
}

async function declineBookingInvite(notificationId = "") {
  const item = notifications.find((entry) => entry.id === notificationId) || notifications.find((entry) => entry.type === "booking-invite" && entry.recipients?.includes(currentPersonaId()));
  if (!item) return false;
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/reservations/${item.reservationId}/respond`, {
        method: "POST",
        body: JSON.stringify({ response: "decline" })
      });
      await refreshPlatformReservations();
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  return updateBookingReservationState(item.reservationId, currentPersonaId(), "declined");
}

function firstUpcomingEvent() {
  return events[0];
}

async function createProductOrder() {
  const product = document.querySelector("#orderProductInput")?.value || clubShopItems[0].title;
  const mode = document.querySelector("#orderDeliveryInput")?.value || "reservation";
  const pickupDate = document.querySelector("#orderPickupInput")?.value?.trim();
  const reservationValue = document.querySelector("#orderReservationInput")?.value || "";
  const eventId = document.querySelector("#orderEventInput")?.value;
  const note = document.querySelector("#orderNoteInput")?.value?.trim();
  const item = clubShopItems.find((shopItem) => shopItem.title === product) || clubShopItems[0];
  const player = currentPlayerRecord();
  const reservation = visibleReservations().find((entry) => entry.id === reservationValue) || visibleReservations()[0] || personalReservations[0];
  const event = events.find((eventItem) => eventItem.id === eventId) || firstUpcomingEvent();
  const reservationLabel = reservation ? `${reservationDateLabel(reservation)} ${reservation.start}` : (pickupDate || "bez rezervace");
  if (platformContext.enabled) {
    if (mode === "reservation" && !reservation) {
      lastActionMessage = "Pro doruceni k rezervaci nejdrive vyber svou aktivni rezervaci.";
      return false;
    }
    if (mode === "event" && !event) {
      lastActionMessage = "Vyber aktivni klubovou akci.";
      return false;
    }
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/orders`, {
        method: "POST",
        body: JSON.stringify({
          productName: product,
          productType: isStringingProduct(product) ? "service" : item.type === "demo" ? "demo" : "product",
          amountMinor: Math.round(Number((item.price || "").match(/\d+/)?.[0] || 0) * 100),
          deliveryMode: mode,
          pickupDate: mode === "pickup" ? pickupDate : null,
          reservationId: mode === "reservation" ? reservation.id : null,
          eventId: mode === "event" ? event.id : null,
          note
        })
      });
      await refreshPlatformOrders();
      if (isStringingProduct(product)) await refreshPlatformStringing();
      lastActionMessage = "Objednavka byla odeslana spravci.";
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  const order = {
    id: `order-${Date.now()}`,
    player: player.name,
    playerId: player.id || currentPersonaId(),
    product,
    type: item.type,
    status: "nova objednavka",
    reservation: mode === "reservation" ? reservationLabel : mode === "event" ? event.title : (pickupDate || "vyzvednuti na klubu"),
    reservationIndex: mode === "reservation" ? personalReservations.indexOf(reservation) : undefined,
    deliveryMode: mode,
    pickupDate: mode === "pickup" ? pickupDate : "",
    eventId: mode === "event" ? event.id : "",
    eventTitle: mode === "event" ? event.title : "",
    batch: mode === "event" ? "pridat do akce / demo baliku" : mode === "reservation" ? "nachystat k rezervaci" : "nachystat na klub",
    value: Number((item.price || "").match(/\d+/)?.[0] || 0),
    note: note || "bez poznamky"
  };
  playerOrders.unshift(order);
  if (isStringingProduct(product)) {
    order.status = "servis predan vypletaci";
    order.batch = "automaticky ukol pro vypletace";
    createStringingOrderFromProduct(order, reservation);
  }
  persistData();
  return true;
}

function legacySaveAdminOrder(product, player) {
  const order = playerOrders.find((item) => item.product === product && item.player === player) || playerOrders.find((item) => item.product === product);
  if (!order) return false;
  order.status = order.deliveryMode === "reservation" ? "nachystat k rezervaci" : order.deliveryMode === "event" ? "pridano do akce" : "nachystat na klubu";
  order.batch = `${order.batch || "klubovy balik"} · spravce prevzal`;
  persistData();
  return true;
}

function legacyFriendOptions(preselected = "") {
  const friends = friendsForPlayer();
  return friends
    .filter((player) => player.id !== currentPersonaId())
    .map((player) => `
      <label class="choice-card">
        <input type="checkbox" name="inviteFriend" value="${player.id}" ${player.id === preselected ? "checked" : ""}>
        <span class="avatar tiny-avatar ${player.gender === "female" ? "gender-female" : "gender-male"}">${player.initials}</span>
        <span><b>${player.name}</b><small>${player.level} · ${player.lastPlayed}</small></span>
      </label>
    `).join("");
}

function selectedInvitees(maxCount = 4) {
  return [...document.querySelectorAll("input[name='inviteFriend']:checked")]
    .map((input) => input.value)
    .filter((id) => id !== currentPersonaId())
    .slice(0, maxCount);
}

function parseProposalTime(value = "") {
  const timeMatch = value.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!timeMatch) return null;
  const isoMatch = value.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  const czDateMatch = value.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})?/);
  let isoDate = isoMatch?.[1] || "";
  if (!isoDate && czDateMatch) {
    const year = Number(czDateMatch[3]) || appToday.getFullYear();
    isoDate = dateToIso(new Date(year, Number(czDateMatch[2]) - 1, Number(czDateMatch[1])));
  }
  const day = isoDate ? weekdayCodes[(dateFromIso(isoDate) || appToday).getDay()] : normalizeDayKey((value.trim().split(/\s+/)[0] || "Dnes"));
  return { day, date: isoDate, isoDate, start: timeMatch[1], end: timeMatch[2] };
}

function nextIsoDateForDay(dayKey = "Dnes") {
  const normalized = normalizeDayKey(dayKey);
  if (normalized === "Dnes") return dateToIso(appToday);
  if (normalized === "Zitra") return dateToIso(dateForWeekIndex(1));
  const targetIndex = weekdayCodes.indexOf(normalized);
  if (targetIndex < 0) return selectedBookingIsoDate();
  const delta = (targetIndex - appToday.getDay() + 7) % 7;
  return dateToIso(dateForWeekIndex(delta));
}

function courtFromLabel(label = "") {
  const name = label.split("Â·")[0].split("·")[0].trim();
  return courts.find((court) => court.name === name) || courts[0];
}

function courtHasTimeCollision(court, isoDate, start, end) {
  return (court?.reservations || []).some((slot) =>
    (slot.isoDate || selectedBookingIsoDate()) === isoDate &&
    timeRangesOverlap(slot.start, slot.end, start, end)
  );
}

function availableGameTimeOptions() {
  const durations = [60, 90, 120];
  const options = [];
  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const date = new Date(appToday.getFullYear(), appToday.getMonth(), appToday.getDate() + dayOffset);
    const isoDate = dateToIso(date);
    slots().forEach((start) => {
      durations.forEach((duration) => {
        const end = minutesToTime(timeToMinutes(start) + duration);
        if (timeToMinutes(end) > timeToMinutes(club.close)) return;
        const hasFreeCourt = courts.some((court) => !courtHasTimeCollision(court, isoDate, start, end));
        if (!hasFreeCourt) return;
        options.push(`${formatPortalDate(date)} ${start}-${end}`);
      });
    });
  }
  return options;
}

function legacyCreateGameInvitation() {
  const gameType = document.querySelector("#inviteGameType")?.value || "double";
  const maxInvitees = gameType === "single" ? 1 : 3;
  const invitees = selectedInvitees(maxInvitees);
  if (!invitees.length) return false;
  const time = document.querySelector("#inviteTimeInput")?.value || "Patek 17:00-18:30";
  const court = document.querySelector("#inviteCourtInput")?.value || "Kurt 1 · Antuka";
  const owner = currentPlayerRecord();
  const proposal = {
    id: `proposal-${Date.now()}`,
    ownerId: currentPersonaId(),
    gameType,
    title: time,
    court,
    sentTo: invitees.map((id) => {
      const player = playerRecordById(id);
      return { name: player.name, initials: player.initials, playerId: id, status: "pending" };
    }),
    state: "Ceka se na potvrzeni pozvanych hracu",
    note: gameType === "single" ? "Single se vytvori po potvrzeni jednoho hrace." : "Double se vytvori po doplneni sestavy do 4 hracu."
  };
  gameProposals.unshift(proposal);
  invitees.forEach((id) => notifications.push({
    id: `game-invite-${proposal.id}-${id}`,
    type: "invite",
    recipients: [id],
    title: "Pozvanka na hru",
    meta: `${owner.name} zve: ${time}, ${court}`,
    status: "Ceka na tebe",
    proposalId: proposal.id
  }));
  persistData();
  return true;
}

function legacyCreateEventInvitation(eventId) {
  const event = events.find((item) => item.id === eventId) || events[0];
  const invitees = selectedInvitees(99);
  if (!invitees.length) return false;
  const owner = currentPlayerRecord();
  invitees.forEach((id) => notifications.push({
    id: `event-invite-${event.id}-${Date.now()}-${id}`,
    type: "event-invite",
    recipients: [id],
    title: "Pozvanka na akci",
    meta: `${owner.name} zve na ${event.title}`,
    status: "Ceka na potvrzeni",
    eventId: event.id
  }));
  persistData();
  return true;
}

function invitedPlayerIdsForContext({ eventId = "", proposalId = "" } = {}) {
  const ids = new Set();
  notifications.forEach((item) => {
    if (eventId && item.type === "event-invite" && item.eventId === eventId) {
      (item.recipients || []).forEach((id) => ids.add(id));
    }
    if (proposalId && item.proposalId === proposalId) {
      (item.recipients || []).forEach((id) => ids.add(id));
    }
  });
  gameProposals.forEach((proposal) => {
    if (!proposalId || proposal.id === proposalId) proposal.sentTo?.forEach((player) => ids.add(player.playerId));
  });
  return ids;
}

function friendOptions(preselected = "", context = {}) {
  const alreadyInvited = invitedPlayerIdsForContext(context);
  const friends = friendsForPlayer();
  return friends
    .filter((player) => player.id !== currentPersonaId() && (player.id === preselected || !alreadyInvited.has(player.id)))
    .map((player) => `
      <label class="choice-card">
        <input type="checkbox" name="inviteFriend" value="${player.id}" ${player.id === preselected ? "checked" : ""}>
        <span class="avatar tiny-avatar ${player.gender === "female" ? "gender-female" : "gender-male"}">${player.initials}</span>
        <span><b>${player.name}</b><small>${player.level} · ${player.lastPlayed}</small></span>
      </label>
    `).join("") || `<div class="empty-state">Zatim nemas potvrzene kamarady. Otevri hrace klubu a posli zadost o kamaradstvi.</div>`;
}

async function saveAdminOrder(product, player) {
  const order = playerOrders.find((item) => item.product === product && item.player === player) || playerOrders.find((item) => item.product === product);
  if (!order) return false;
  const source = document.querySelector("#orderSourceInput")?.value || order.source || "stock";
  if (platformContext.enabled) {
    const status = document.querySelector("#orderStatusInput")?.value || (source === "supplier" ? "ordered" : source === "check" ? "checking" : "preparing");
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/orders/${order.id}`, {
        method: "PUT",
        body: JSON.stringify({ source, status })
      });
      await refreshPlatformOrders();
      lastActionMessage = "Stav objednavky byl ulozen.";
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  order.source = source;
  order.sourceLabel = source === "stock" ? "ze skladu klubu" : source === "supplier" ? "objednat od dodavatele" : "overit dostupnost";
  order.status = source === "supplier"
    ? "objednat od dodavatele"
    : order.deliveryMode === "reservation"
      ? "vyrizeno spravcem - nachystat k rezervaci"
      : order.deliveryMode === "event"
        ? "vyrizeno spravcem - pridano do akce"
        : "vyrizeno spravcem - nachystat na klubu";
  order.batch = `${order.batch || "klubovy balik"} · spravce prevzal`;
  persistData();
  return true;
}

async function createGameInvitation() {
  lastActionMessage = "";
  const gameType = document.querySelector("#inviteGameType")?.value || "double";
  const maxInvitees = gameType === "single" ? 1 : 3;
  const rawInvitees = selectedInvitees(maxInvitees);
  if (!rawInvitees.length) {
    lastActionMessage = "Vyber aspon jednoho hrace.";
    return false;
  }
  const time = document.querySelector("#inviteTimeInput")?.value || "Patek 17:00-18:30";
  const court = document.querySelector("#inviteCourtInput")?.value || "Kurt 1 · Antuka";
  const selectedCourtForProposal = courts.find((item) => item.id === court) || courtFromLabel(court);
  const parsed = parseProposalTime(time);
  const proposalIsoDate = parsed?.isoDate || (parsed ? nextIsoDateForDay(parsed.day) : selectedBookingIsoDate());
  if (parsed && playerHasTimeCollision(currentPersonaId(), parsed.day, proposalIsoDate, parsed.start, parsed.end)) {
    lastActionMessage = "V tomto case uz mas rezervaci. Vyber jiny termin.";
    return false;
  }
  if (parsed && courtHasTimeCollision(selectedCourtForProposal, proposalIsoDate, parsed.start, parsed.end)) {
    lastActionMessage = "Vybrany kurt je v tomto case obsazeny. Vyber jiny cas nebo kurt.";
    return false;
  }
  const duplicate = gameProposals.find((proposal) => proposal.ownerId === currentPersonaId() && proposal.title === time && proposal.court === court);
  const already = duplicate ? new Set(duplicate.sentTo.map((player) => player.playerId)) : new Set();
  const invitees = rawInvitees.filter((id) =>
    !already.has(id) &&
    (!parsed || !playerHasTimeCollision(id, parsed.day, proposalIsoDate, parsed.start, parsed.end))
  );
  if (!invitees.length) {
    const blockedNames = rawInvitees
      .map((id) => playerRecordById(id)?.name || id)
      .join(", ");
    lastActionMessage = `${blockedNames} uz v tomto case hraje nebo uz ma pozvanku. Vyber jiny termin.`;
    return false;
  }
  const owner = currentPlayerRecord();
  if (platformContext.enabled) {
    const selectedCourt = selectedCourtForProposal;
    const participantMembershipIds = invitees.map((id) => platformContext.membersByPersona.get(id)).filter(Boolean);
    if (!parsed || !selectedCourt || participantMembershipIds.length !== invitees.length) {
      lastActionMessage = "Termin, kurt nebo nektery hrac uz neni dostupny.";
      return false;
    }
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/reservations`, {
        method: "POST",
        body: JSON.stringify({
          courtId: selectedCourt.id,
          date: proposalIsoDate,
          start: parsed.start,
          end: parsed.end,
          gameType,
          participantMembershipIds,
          participantMode: "pending",
          title: "Navrh hry"
        })
      });
      await refreshPlatformReservations();
      lastActionMessage = "Navrh byl odeslan a kurt ceka na potvrzeni hracu.";
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  const proposal = duplicate || {
    id: `proposal-${Date.now()}`,
    ownerId: currentPersonaId(),
    gameType,
    isoDate: proposalIsoDate,
    title: time,
    court,
    sentTo: [],
    state: "Ceka se na potvrzeni pozvanych hracu",
    note: gameType === "single" ? "Single se vytvori po potvrzeni jednoho hrace." : "Double se vytvori po doplneni sestavy do 4 hracu."
  };
  invitees.forEach((id) => {
    const player = playerRecordById(id);
    proposal.sentTo.push({ name: player.name, initials: player.initials, playerId: id, status: "pending" });
  });
  if (!duplicate) gameProposals.unshift(proposal);
  notifications.splice(0, notifications.length, ...notifications.filter((item) =>
    !(item.proposalId === proposal.id && item.type === "invite" && item.recipients?.some((id) => invitees.includes(id)))
  ));
  invitees.forEach((id) => notifications.push({
    id: `game-invite-${proposal.id}-${id}`,
    type: "invite",
    recipients: [id],
    title: "Pozvanka na hru",
    meta: `${owner.name} zve: ${time}, ${court}`,
    status: "Ceka na tebe",
    proposalId: proposal.id
  }));
  persistData();
  return true;
}

function createEventInvitation(eventId) {
  const event = events.find((item) => item.id === eventId) || events[0];
  const alreadyInvited = invitedPlayerIdsForContext({ eventId: event.id });
  const invitees = selectedInvitees(99).filter((id) => !alreadyInvited.has(id));
  if (!invitees.length) return false;
  const owner = currentPlayerRecord();
  notifications.splice(0, notifications.length, ...notifications.filter((item) =>
    !(item.type === "event-invite" && item.eventId === event.id && item.recipients?.some((id) => invitees.includes(id)))
  ));
  invitees.forEach((id) => notifications.push({
    id: `event-invite-${event.id}-${Date.now()}-${id}`,
    type: "event-invite",
    recipients: [id],
    title: "Pozvanka na akci",
    meta: `${owner.name} zve na ${event.title}`,
    status: "Ceka na potvrzeni",
    eventId: event.id
  }));
  persistData();
  return true;
}

async function acceptReplacementInvite(notificationId = "") {
  const item = notifications.find((entry) => entry.id === notificationId) || notifications.find((entry) => ["invite", "replacement-invite"].includes(entry.type) && entry.recipients?.includes(currentPersonaId()));
  if (!item) return false;
  if (platformContext.enabled && item.reservationId) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/reservations/${item.reservationId}/replacements/respond`, {
        method: "POST", body: JSON.stringify({ response: "accept" })
      });
      await refreshPlatformReservations();
      lastActionMessage = "Souhlas s roli nahradnika byl odeslan sestave.";
      return true;
    } catch (error) { lastActionMessage = error.message; return false; }
  }
  const reservation = personalReservations[item.reservationIndex || 0];
  const playerId = currentPersonaId();
  if (reservation?.attendance) {
    let me = reservation.attendance.find((player) => normalizeAttendancePlayer(player).playerId === playerId);
    if (me && me.status !== "candidate") return false;
    if (!me) {
      reservation.attendance.push(attendanceFromPlayerId(playerId, "replacement", "potvrdil nahradnika"));
    } else {
      me.status = "replacement";
      me.role = "potvrdil nahradnika";
    }
  }
  notifications.splice(0, notifications.length, ...notifications.filter((entry) => entry.id !== item.id));
  persistData();
  return true;
}

async function declineReplacementInvite(notificationId = "") {
  const item = notifications.find((entry) => entry.id === notificationId);
  if (!item) return false;
  if (platformContext.enabled && item.reservationId) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/reservations/${item.reservationId}/replacements/respond`, {
        method: "POST", body: JSON.stringify({ response: "decline" })
      });
      await refreshPlatformReservations();
      lastActionMessage = "Pozvanka nahradnika byla odmitnuta.";
      return true;
    } catch (error) { lastActionMessage = error.message; return false; }
  }
  notifications.splice(0, notifications.length, ...notifications.filter((entry) => entry.id !== item.id));
  persistData();
  return true;
}

async function voteForPlatformReplacement(notificationId = "") {
  const item = notifications.find((entry) => entry.id === notificationId);
  if (!item?.reservationId || !item.candidateMembershipId) return false;
  try {
    await platformRequest(`/api/v2/clubs/${platformContext.clubId}/reservations/${item.reservationId}/replacements/vote`, {
      method: "POST", body: JSON.stringify({ candidateMembershipId: item.candidateMembershipId })
    });
    await refreshPlatformReservations();
    lastActionMessage = "Hlas pro nahradnika je ulozeny.";
    return true;
  } catch (error) { lastActionMessage = error.message; return false; }
}

async function declineGameProposal(proposalId) {
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/reservations/${proposalId}/respond`, {
        method: "POST",
        body: JSON.stringify({ response: "decline" })
      });
      await refreshPlatformReservations();
      lastActionMessage = "Pozvanka byla odmitnuta.";
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  const playerId = currentPersonaId();
  const proposal = gameProposals.find((item) => item.id === proposalId);
  if (!proposal) return false;
  const invited = proposal.sentTo.find((player) => player.playerId === playerId);
  if (invited) {
    invited.status = "declined";
    proposal.state = `${playerRecordById(playerId)?.name || "Hrac"} odmitl pozvanku`;
  }
  notifications.splice(0, notifications.length, ...notifications.filter((item) => !(item.proposalId === proposalId && item.recipients?.includes(playerId))));
  persistData();
  return true;
}

async function sendGameCounterproposal(proposalId = "") {
  const date = document.querySelector("#counterDateInput")?.value;
  const courtId = document.querySelector("#counterCourtInput")?.value;
  const start = document.querySelector("#counterStartInput")?.value;
  const end = document.querySelector("#counterEndInput")?.value;
  if (!platformContext.enabled || !proposalId) return false;
  try {
    await platformRequest(`/api/v2/clubs/${platformContext.clubId}/reservations/${proposalId}/counterproposals`, {
      method: "POST", body: JSON.stringify({ date, courtId, start, end })
    });
    await refreshPlatformReservations();
    lastActionMessage = "Protinavrh byl odeslan zvoucimu hraci.";
    return true;
  } catch (error) { lastActionMessage = error.message; return false; }
}

async function respondGameCounterproposal(notificationId = "", response = "accept") {
  const item = notifications.find((entry) => entry.id === notificationId);
  if (!item?.counterproposalId) return false;
  try {
    await platformRequest(`/api/v2/clubs/${platformContext.clubId}/counterproposals/${item.counterproposalId}/respond`, {
      method: "POST", body: JSON.stringify({ response })
    });
    await refreshPlatformReservations();
    lastActionMessage = response === "accept" ? "Novy termin je rezervovany v kalendari kurtu." : "Protinavrh byl odmitnut.";
    return true;
  } catch (error) { lastActionMessage = error.message; return false; }
}

async function acceptEventInvite(eventId, notificationId = "") {
  const event = events.find((item) => item.id === eventId);
  if (!event) return false;
  if (!await joinEventForPlayer(event.id)) return false;
  notifications.splice(0, notifications.length, ...notifications.filter((item) => item.id !== notificationId));
  persistData();
  return true;
}

function nextVisibleReservation() {
  return visibleReservations()[0];
}

function slotType(court, time) {
  const current = timeToMinutes(time);
  const reservation = courtReservations(court).find((item) => current >= timeToMinutes(item.start) && current < timeToMinutes(item.end));
  if (!reservation) return "free";
  if (state.role === "admin") return reservation.type === "special" ? "special" : "busy";
  const linked = reservation.reservationId ? reservationById(reservation.reservationId) : null;
  if (!linked) return reservation.type;
  const attendance = normalizedAttendance(linked);
  const mine = attendance.find((player) => player.playerId === currentPersonaId());
  if (reservation.type === "mine") return mine && activeForGame(mine) ? "mine" : "busy";
  if (reservation.type === "pending") return mine && mine.status !== "declined" ? "pending" : "busy";
  return reservation.type;
}

function slotReservation(court, time) {
  const current = timeToMinutes(time);
  return courtReservations(court).find((item) => current >= timeToMinutes(item.start) && current < timeToMinutes(item.end));
}

function reservationFromSlotData(data = {}) {
  const court = courtFromBookingValue(data.court || "");
  const slot = court ? slotReservation(court, data.time || club.open) : null;
  const reservation = slot?.reservationId ? reservationById(slot.reservationId) : null;
  return { court, slot, reservation };
}

function slotPlayerIds(slot, reservation) {
  const ids = new Set();
  if (reservation) normalizedAttendance(reservation).forEach((player) => player.playerId && ids.add(player.playerId));
  (slot?.players || []).forEach((name) => {
    const player = playerRecordByNameOrInitials({ name });
    if (player?.id) ids.add(player.id);
  });
  return ids;
}

function slotJoinState(data = {}, playerId = currentPersonaId()) {
  const { court, slot, reservation } = reservationFromSlotData(data);
  if (!court || !slot) return { allowed: false, reason: "Slot se nenasel." };
  const day = reservation?.day || weekdayCodes[selectedBookingDateObject().getDay()];
  const date = reservation ? reservationIsoDate(reservation) : selectedBookingIsoDate();
  const ids = slotPlayerIds(slot, reservation);
  if (ids.has(playerId) || (reservation && reservationHasAnyPlayer(reservation, playerId))) {
    return { allowed: false, court, slot, reservation, reason: "Uz jsi soucasti teto rezervace, nemuzes se prihlasit sam za sebe." };
  }
  if (reservation && normalizedAttendance(reservation).some((player) => player.playerId === playerId && player.status === "candidate")) {
    return { allowed: false, court, slot, reservation, reason: "Uz jsi vedeny jako kandidat, skupina te musi potvrdit." };
  }
  if (playerHasTimeCollision(playerId, day, date, slot.start, slot.end, reservation?.id || "")) {
    return { allowed: false, court, slot, reservation, reason: "V tomto case uz mas jinou rezervaci nebo cekajici pozvanku." };
  }
  return { allowed: true, court, slot, reservation, reason: "Muzes se prihlasit jako kandidat." };
}

function joinOpenSlot(courtName = "", time = "") {
  const stateInfo = slotJoinState({ court: courtName, time });
  if (!stateInfo.allowed) return false;
  const playerId = currentPersonaId();
  if (stateInfo.reservation?.attendance) {
    stateInfo.reservation.attendance.push(attendanceFromPlayerId(playerId, "candidate", "hlasi se do hry"));
    const reservationIndex = personalReservations.findIndex((item) => item.id === stateInfo.reservation.id);
    const candidate = playerRecordById(playerId);
    const recipients = normalizedAttendance(stateInfo.reservation)
      .filter((player) => activeForGame(player) && player.playerId && player.playerId !== playerId)
      .map((player) => player.playerId);
    const id = `replacement-vote-${reservationIndex}-${playerId}`;
    notifications.splice(0, notifications.length, ...notifications.filter((item) => item.id !== id));
    notifications.push({
      id,
      type: "replacement",
      recipients,
      title: "Hlasovani o nahradnikovi",
      meta: `${candidate?.name || "Nahradnik"} se hlasi do hry ${reservationDateLabel(stateInfo.reservation)} ${stateInfo.reservation.start}`,
      status: "Ceka na hlasovani",
      reservationIndex,
      candidateId: playerId,
      votes: {}
    });
  } else if (stateInfo.slot) {
    const player = currentPlayerRecord();
    stateInfo.slot.players = Array.from(new Set([...(stateInfo.slot.players || []), player.name.split(" ")[0]]));
  }
  persistData();
  return true;
}

function courtReservations(court) {
  const selectedIso = selectedBookingIsoDate();
  const selectedDayCode = weekdayCodes[selectedBookingDateObject().getDay()];
  return court.reservations
    .filter((item) => {
      if (item.reservationId && reservationById(item.reservationId)?.status === "cancelled") return false;
      if (item.isoDate) return item.isoDate === selectedIso;
      if (typeof item.day === "number") return item.day === state.selectedDay;
      if (typeof item.day === "string") return normalizeDayKey(item.day) === selectedDayCode;
      return state.selectedDay === 0 && !state.selectedBookingDate;
    })
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
}

function shiftTime(time, delta) {
  const next = Math.max(timeToMinutes(club.open), Math.min(timeToMinutes(club.close), timeToMinutes(time) + delta));
  return minutesToTime(next);
}

function periodSlots(period) {
  return slots().filter((time) => {
    const minutes = timeToMinutes(time);
    return period === "morning" ? minutes < timeToMinutes("12:00") : minutes >= timeToMinutes("12:00");
  });
}

function freeWindows() {
  return [
    { court: courts[1], start: "17:00", duration: "1.5 h" },
    { court: courts[3], start: "18:30", duration: "2 h" },
    { court: courts[0], start: "20:00", duration: "1 h" }
  ].filter((item) => item.court);
}

function formatMoney(value, currency = club.currency) {
  return `${new Intl.NumberFormat("cs-CZ").format(value)} ${currency}`;
}

function priceRulesForCourt(court) {
  return courtPriceRules.filter((rule) => rule.court === court.id);
}

function reservationHours(reservation = {}) {
  const start = timeToMinutes(reservation.start);
  const end = timeToMinutes(reservation.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return (end - start) / 60;
}

function priceForCourtAt(court, time = club.open) {
  const minute = timeToMinutes(time);
  const rules = priceRulesForCourt(court);
  const rule = rules.find((item) =>
    Number.isFinite(minute) &&
    timeToMinutes(item.start) <= minute &&
    timeToMinutes(item.end) > minute
  ) || rules[0];
  return Number(rule?.price || 180);
}

function reservationRevenueEstimate(reservation = {}) {
  const court = courts.find((item) => item.id === reservation.court?.id || item.name === reservation.court?.name) || reservation.court || courts[0];
  return Math.round(priceForCourtAt(court, reservation.start) * reservationHours(reservation));
}

function reservationsForIsoDate(isoDate) {
  return personalReservations.filter((reservation) =>
    reservation.status !== "cancelled" &&
    reservationIsoDate(reservation) === isoDate
  );
}

function slotsForCourtAndIso(court, isoDate) {
  return (court.reservations || []).filter((slot) => {
    if (slot.reservationId && reservationById(slot.reservationId)?.status === "cancelled") return false;
    return slot.isoDate === isoDate;
  });
}

function occupiedMinutesForSlots(slotsList = []) {
  return slotsList.reduce((sum, slot) => {
    const start = timeToMinutes(slot.start);
    const end = timeToMinutes(slot.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return sum;
    return sum + (end - start);
  }, 0);
}

function freeWindowLabel(court, isoDate = dateToIso(appToday)) {
  const open = timeToMinutes(club.open);
  const close = timeToMinutes(club.close);
  if (!Number.isFinite(open) || !Number.isFinite(close) || close <= open) return "nezadano";
  const occupied = slotsForCourtAndIso(court, isoDate)
    .map((slot) => ({ start: timeToMinutes(slot.start), end: timeToMinutes(slot.end) }))
    .filter((slot) => Number.isFinite(slot.start) && Number.isFinite(slot.end) && slot.end > slot.start)
    .sort((a, b) => a.start - b.start);
  let cursor = open;
  const windows = [];
  occupied.forEach((slot) => {
    if (slot.start > cursor) windows.push([cursor, slot.start]);
    cursor = Math.max(cursor, slot.end);
  });
  if (cursor < close) windows.push([cursor, close]);
  const useful = windows.filter(([start, end]) => end - start >= club.slotMinutes);
  if (!useful.length) return "bez volna";
  const [start, end] = useful.reduce((best, item) => (item[1] - item[0] > best[1] - best[0] ? item : best), useful[0]);
  return `${minutesToTime(start)}-${minutesToTime(end)}`;
}

function liveCourtUtilization(isoDate = dateToIso(appToday)) {
  if (platformAnalytics?.courts?.length && isoDate === dateToIso(appToday)) return platformAnalytics.courts.map((item) => ({court:item.name,surface:courts.find((court)=>court.id===item.id)?.surface||"",utilization:Number(item.occupancyPct||0),free:freeWindowLabel(courts.find((court)=>court.id===item.id)||courts[0],isoDate),revenue:Number(item.revenue_minor||0)/100,tone:Number(item.occupancyPct||0)>=75?"good":Number(item.occupancyPct||0)>=45?"warn":"low"}));
  const open = timeToMinutes(club.open);
  const close = timeToMinutes(club.close);
  const total = Math.max(1, close - open);
  return courts.map((court) => {
    const slotsList = slotsForCourtAndIso(court, isoDate);
    const occupied = occupiedMinutesForSlots(slotsList);
    const utilization = Math.min(100, Math.round((occupied / total) * 100));
    const revenue = slotsList.reduce((sum, slot) => {
      const reservation = slot.reservationId ? reservationById(slot.reservationId) : null;
      const hours = (timeToMinutes(slot.end) - timeToMinutes(slot.start)) / 60;
      return sum + Math.round(priceForCourtAt(court, slot.start) * Math.max(0, hours));
    }, 0);
    return {
      court: court.name,
      surface: court.surface,
      utilization,
      free: freeWindowLabel(court, isoDate),
      revenue,
      tone: utilization >= 75 ? "good" : utilization >= 45 ? "warn" : "low"
    };
  });
}

function incompleteReservationCount(reservations = personalReservations) {
  return reservations.filter((reservation) => {
    const attendance = normalizedAttendance(reservation);
    const activeCount = attendance.filter(activeForGame).length;
    const hasPending = attendance.some((player) => player.status === "pending");
    return reservation.status !== "cancelled" && (activeCount < reservationTargetPlayers(reservation) || hasPending);
  }).length;
}

function liveAdminStats() {
  const todayIso = dateToIso(appToday);
  const todayReservations = reservationsForIsoDate(todayIso);
  const utilization = liveCourtUtilization(todayIso);
  const averageUtilization = utilization.length
    ? Math.round(utilization.reduce((sum, item) => sum + item.utilization, 0) / utilization.length)
    : 0;
  const pendingOrders = playerOrders.filter(orderNeedsAction).length;
  return [
    { value: `${averageUtilization} %`, label: "Vytizeni dnes", tone: averageUtilization >= 70 ? "good" : averageUtilization >= 40 ? "warn" : "low" },
    { value: String(todayReservations.length), label: "Rezervace dnes", tone: "neutral" },
    { value: String(incompleteReservationCount(todayReservations)), label: "Dnes cekaji na hrace", tone: incompleteReservationCount(todayReservations) ? "warn" : "good" },
    { value: String(pendingOrders), label: "Objednavky k vyrizeni", tone: pendingOrders ? "warn" : "good" }
  ];
}

function liveAdminTasks() {
  const todayIso = dateToIso(appToday);
  const todayReservations = reservationsForIsoDate(todayIso);
  const incompleteToday = incompleteReservationCount(todayReservations);
  const pendingOrders = playerOrders.filter(orderNeedsAction);
  const freeCourt = liveCourtUtilization(todayIso).find((item) => item.free !== "bez volna");
  const tasks = [];
  if (incompleteToday) {
    tasks.push({ title: "Doplnit sestavy", meta: `${incompleteToday} dnesni rezervace ceka na hrace nebo potvrzeni`, action: "admin-reservation" });
  }
  if (pendingOrders.length) {
    tasks.push({ title: "Nachystat objednavky", meta: `${pendingOrders.length} objednavky cekaji na sklad / dodavatele / pripravu`, action: "admin-order" });
  }
  if (freeCourt) {
    tasks.push({ title: "Volny kurt pro last minute", meta: `${freeCourt.court}: nejvetsi volno ${freeCourt.free}`, action: "admin-invite" });
  }
  if (!tasks.length) {
    tasks.push({ title: "Dnes je uklizeno", meta: "Rezervace, objednavky i sestavy jsou bez okamziteho problemu", action: "admin-reservation" });
  }
  return tasks;
}

function reservationInMonth(reservation, year, month) {
  const date = dateFromIso(reservationIsoDate(reservation));
  return date && date.getFullYear() === year && date.getMonth() === month;
}

function monthReservations(year, month) {
  return personalReservations.filter((reservation) =>
    reservation.status !== "cancelled" &&
    reservationInMonth(reservation, year, month)
  );
}

function liveMonthlyRevenue() {
  if (platformAnalytics?.months?.length) return platformAnalytics.months.map((item) => ({month:item.month,value:Number(item.revenue_minor||0)/100}));
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(appToday.getFullYear(), appToday.getMonth() - 5 + index, 1);
    const reservations = monthReservations(date.getFullYear(), date.getMonth());
    return {
      month: new Intl.DateTimeFormat("cs-CZ", { month: "short" }).format(date),
      value: reservations.reduce((sum, reservation) => sum + reservationRevenueEstimate(reservation), 0)
    };
  });
}

function liveCourtBusinessStats() {
  if (platformAnalytics?.courts?.length) {
    const maxRevenue=Math.max(1,...platformAnalytics.courts.map((item)=>Number(item.revenue_minor||0)));
    return platformAnalytics.courts.map((item)=>({court:item.name,current:Number(item.revenue_minor||0)/100,max:Math.max(Number(item.revenue_minor||0)/100,Math.round((Number(item.revenue_minor||0)/100)/(Math.max(1,Number(item.occupancyPct||0))/100))),trend:`${Number(item.occupancyPct||0)} %`,popularity:Number(item.revenue_minor||0)===maxRevenue?"nejoblibenejsi":Number(item.revenue_minor||0)===0?"bez rezervaci":"aktivni",series:[35,45,55,Math.max(8,Number(item.occupancyPct||0))]}));
  }
  const year = appToday.getFullYear();
  const month = appToday.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const open = timeToMinutes(club.open);
  const close = timeToMinutes(club.close);
  const dailyHours = Math.max(0, close - open) / 60;
  const monthReservationsList = monthReservations(year, month);
  const totals = new Map(courts.map((court) => [court.id, { current: 0, hours: 0 }]));
  monthReservationsList.forEach((reservation) => {
    const court = courts.find((item) => item.id === reservation.court?.id || item.name === reservation.court?.name) || courts[0];
    const item = totals.get(court.id);
    if (!item) return;
    item.current += reservationRevenueEstimate(reservation);
    item.hours += reservationHours(reservation);
  });
  const maxCurrent = Math.max(1, ...[...totals.values()].map((item) => item.current));
  return courts.map((court) => {
    const item = totals.get(court.id) || { current: 0, hours: 0 };
    const max = Math.round(dailyHours * daysInMonth * priceForCourtAt(court, "18:00"));
    const utilization = max ? Math.round((item.current / max) * 100) : 0;
    const popularity = item.current === maxCurrent && item.current > 0
      ? "nejoblibenejsi"
      : item.current === 0
        ? "bez rezervaci"
        : "aktivni";
    return {
      court: court.name,
      max,
      current: item.current,
      trend: `${utilization} % potencialu`,
      popularity,
      series: [20, 35, 50, 65, Math.max(8, Math.min(100, utilization))]
    };
  });
}

function courtSurfaceClass(surface) {
  return surface === "Antuka" ? "clay-surface" : surface === "Trava" ? "grass-surface" : "hard-surface";
}

function courtSurfaceColor(surface) {
  return surface === "Antuka" ? "#c66532" : surface === "Trava" ? "#3d8f51" : "#2d79c7";
}

function nextCourtId() {
  let number = courts.length + 1;
  const used = new Set(courts.map((court) => court.id));
  while (used.has(`c${number}`)) number += 1;
  return `c${number}`;
}

function draftCourt() {
  const surface = "Antuka";
  return {
    id: "new",
    name: `Kurt ${courts.length + 1}`,
    surface,
    surfaceClass: courtSurfaceClass(surface),
    color: courtSurfaceColor(surface),
    photo: courtPhoto,
    reservations: []
  };
}

function playerFinalPrice(basePrice, player) {
  return Math.round(basePrice * (1 - (player.discount || 0) / 100));
}

function totalCredit(player) {
  return (player.paidCredit || 0) + (player.bonusCredit || 0);
}

function creditRuleForAmount(amount) {
  return [...creditBonusRules]
    .filter((rule) => Number(rule.paid) <= Number(amount) && Number(rule.paid) > 0)
    .sort((left, right) => Number(right.paid) - Number(left.paid))[0] || null;
}

function playerCreditTransactions(playerId) {
  return creditTransactions
    .filter((transaction) => transaction.playerId === playerId)
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
}

function manualCreditPreview(amount) {
  const paid = Math.max(0, Number(amount) || 0);
  const rule = creditRuleForAmount(paid);
  const bonus = rule ? Number(rule.bonus) || 0 : 0;
  return { paid, bonus, total: paid + bonus, rule };
}

function courtCharge(basePrice, hours, player) {
  const finalHourly = playerFinalPrice(basePrice, player);
  return {
    baseHourly: basePrice,
    finalHourly,
    hours,
    total: Math.round(finalHourly * hours),
    discountAmount: Math.round((basePrice - finalHourly) * hours)
  };
}

function loyaltyTierForHours(hours) {
  return [...loyaltyTiers].reverse().find((tier) => hours >= tier.hours) || { hours: 0, bonus: 0, label: "Novy hrac" };
}

function nextLoyaltyTier(hours) {
  return loyaltyTiers.find((tier) => hours < tier.hours) || loyaltyTiers.at(-1);
}

function loyaltyProgress(player) {
  const current = loyaltyTierForHours(player.playedHours || 0);
  const next = nextLoyaltyTier(player.playedHours || 0);
  const previousHours = current.hours || 0;
  const span = Math.max(1, next.hours - previousHours);
  const done = Math.min(100, Math.round(((player.playedHours - previousHours) / span) * 100));
  return { current, next, done };
}

function playerTone(player) {
  if (player.accountType === "club") return "club";
  if (player.accountType === "credit") return "credit";
  return "guest";
}

function normalizedSearchText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function escapeAttribute(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function visibleAdminNote(player) {
  const note = String(player?.adminNote || "").trim();
  return normalizedSearchText(note) === "cisty testovaci profil bez stare historie." ? "" : note;
}

function filteredAdminPlayers() {
  const query = normalizedSearchText(state.adminPlayerSearch);
  if (!query) return adminPlayerDirectory;
  return adminPlayerDirectory.filter((player) => normalizedSearchText([
    player.name,
    player.email,
    player.accountLabel,
    player.accountType,
    player.level,
    player.id
  ].filter(Boolean).join(" ")).includes(query));
}

function setPriceForm({ days, start, end, price }) {
  const daysInput = document.querySelector("#priceDays");
  const startInput = document.querySelector("#priceStart");
  const endInput = document.querySelector("#priceEnd");
  const priceInput = document.querySelector("#priceAmount");
  if (daysInput && days) daysInput.value = days;
  if (startInput && start) startInput.value = start;
  if (endInput && end) endInput.value = end;
  if (priceInput && price) priceInput.value = price;
}

function splitPriceRuleByOverlap(rule, newRule) {
  if (rule.court !== newRule.court || rule.days !== newRule.days) return [rule];
  const ruleStart = timeToMinutes(rule.start);
  const ruleEnd = timeToMinutes(rule.end);
  const newStart = timeToMinutes(newRule.start);
  const newEnd = timeToMinutes(newRule.end);
  if (ruleEnd <= newStart || ruleStart >= newEnd) return [rule];

  const pieces = [];
  if (ruleStart < newStart) {
    pieces.push({ ...rule, id: `${rule.id}-before-${newStart}`, end: newRule.start });
  }
  if (ruleEnd > newEnd) {
    pieces.push({ ...rule, id: `${rule.id}-after-${newEnd}`, start: newRule.end });
  }
  return pieces;
}

async function savePriceRule(courtId) {
  if (!courts.some((court) => court.id === courtId)) return false;
  const days = document.querySelector("#priceDays")?.value || "Po-Pa";
  const start = document.querySelector("#priceStart")?.value || club.open;
  const end = document.querySelector("#priceEnd")?.value || club.close;
  const price = Number(String(document.querySelector("#priceAmount")?.value || "0").replace(/[^\d.]/g, ""));
  if (timeToMinutes(end) <= timeToMinutes(start) || !price) {
    lastActionMessage = "Zadej platny casovy usek a cenu.";
    return false;
  }
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/courts/${courtId}/price-rules`, {
        method: "POST",
        body: JSON.stringify({
          dayKey: platformPriceDayKey(days),
          startTime: start,
          endTime: end,
          priceMinor: Math.round(price * 100)
        })
      });
      await refreshPlatformReservations();
      lastActionMessage = `Cena ${formatMoney(price)}/h pro ${days} ${start}-${end} je ulozena.`;
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  const newRule = { id: `local-price-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, court: courtId, days, start, end, price };
  courtPriceRules = courtPriceRules
    .flatMap((rule) => splitPriceRuleByOverlap(rule, newRule))
    .filter((rule) => timeToMinutes(rule.end) > timeToMinutes(rule.start));
  courtPriceRules.push(newRule);
  courtPriceRules.sort((a, b) =>
    a.court.localeCompare(b.court) ||
    a.days.localeCompare(b.days) ||
    timeToMinutes(a.start) - timeToMinutes(b.start)
  );
  persistData();
  return true;
}

async function removePriceRule(courtId, ruleId) {
  const rule = courtPriceRules.find((item) => item.id === ruleId && item.court === courtId);
  if (!rule) {
    lastActionMessage = "Cenovy usek uz neexistuje.";
    return false;
  }
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/courts/${courtId}/price-rules/${ruleId}`, { method: "DELETE" });
      await refreshPlatformReservations();
      lastActionMessage = `Cenovy usek ${rule.days} ${rule.start}-${rule.end} byl odebran.`;
      return true;
    } catch (error) {
      lastActionMessage = error.code === "price_rule_not_found" ? "Cenovy usek uz byl odebran." : error.message;
      return false;
    }
  }
  courtPriceRules = courtPriceRules.filter((item) => item.id !== ruleId);
  persistData();
  lastActionMessage = `Cenovy usek ${rule.days} ${rule.start}-${rule.end} byl odebran.`;
  return true;
}

async function saveCourtSettings(courtId) {
  const court = courts.find((item) => item.id === courtId);
  if (!court) return createCourtSettings();
  const name = document.querySelector("#courtNameInput")?.value?.trim() || "";
  const surface = document.querySelector("#courtSurfaceInput")?.value || court.surface;
  const color = document.querySelector("#courtColorInput")?.value?.trim() || courtSurfaceColor(surface);
  const open = document.querySelector("#clubOpenInput")?.value?.trim();
  const close = document.querySelector("#clubCloseInput")?.value?.trim();
  const photo = document.querySelector("#courtPhotoUrlInput")?.value?.trim();
  if (!name) {
    lastActionMessage = "Zadej nazev kurtu.";
    return false;
  }
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    lastActionMessage = "Barvu zadej ve formatu #RRGGBB.";
    return false;
  }
  if (!open || !close || timeToMinutes(close) <= timeToMinutes(open)) {
    lastActionMessage = "Zavirani kurtu musi byt pozdeji nez otevreni.";
    return false;
  }
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/courts/${courtId}`, {
        method: "PUT",
        body: JSON.stringify({
          name,
          surface: platformSurfaceCode(surface),
          color,
          photoUrl: photo || courtPhoto,
          openTime: open,
          closeTime: close
        })
      });
      await refreshPlatformReservations();
      lastActionMessage = `${name} je ulozeny a zmena je viditelna vsem hracum.`;
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  court.name = name;
  court.surface = surface;
  if (color) court.color = color;
  if (photo) court.photo = photo;
  if (open && close && timeToMinutes(close) > timeToMinutes(open)) {
    club.open = open;
    club.close = close;
  }
  court.surfaceClass = courtSurfaceClass(surface);
  syncReservationCourtReferences();
  persistData();
  return true;
}

async function createCourtSettings() {
  const surface = document.querySelector("#courtSurfaceInput")?.value || "Antuka";
  const name = document.querySelector("#courtNameInput")?.value?.trim() || `Kurt ${courts.length + 1}`;
  const color = document.querySelector("#courtColorInput")?.value?.trim() || courtSurfaceColor(surface);
  const open = document.querySelector("#clubOpenInput")?.value?.trim();
  const close = document.querySelector("#clubCloseInput")?.value?.trim();
  const photo = document.querySelector("#courtPhotoUrlInput")?.value?.trim() || courtPhoto;
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    lastActionMessage = "Barvu zadej ve formatu #RRGGBB.";
    return false;
  }
  if (!open || !close || timeToMinutes(close) <= timeToMinutes(open)) {
    lastActionMessage = "Zavirani kurtu musi byt pozdeji nez otevreni.";
    return false;
  }
  if (platformContext.enabled) {
    try {
      const result = await platformRequest(`/api/v2/clubs/${platformContext.clubId}/courts`, {
        method: "POST",
        body: JSON.stringify({
          name,
          surface: platformSurfaceCode(surface),
          color,
          photoUrl: photo,
          openTime: open,
          closeTime: close
        })
      });
      const defaultPrice = Number(String(document.querySelector("#courtBasePriceInput")?.value || "180").replace(/\D/g, "")) || 180;
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/courts/${result.court.id}/price-rules`, {
        method: "POST",
        body: JSON.stringify({
          dayKey: "all",
          startTime: open,
          endTime: close,
          priceMinor: defaultPrice * 100
        })
      });
      await refreshPlatformReservations();
      lastActionMessage = `${name} byl pridan a je dostupny v rezervacich.`;
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  const id = nextCourtId();
  courts.push({
    id,
    name,
    surface,
    surfaceClass: courtSurfaceClass(surface),
    color,
    photo,
    reservations: []
  });
  const defaultPrice = Number(String(document.querySelector("#courtBasePriceInput")?.value || "180").replace(/\D/g, "")) || 180;
  courtPriceRules.push({ id: `local-price-${id}-default`, court: id, days: "Po-Ne", start: club.open, end: club.close, price: defaultPrice });
  if (open && close && timeToMinutes(close) > timeToMinutes(open)) {
    club.open = open;
    club.close = close;
  }
  syncReservationCourtReferences();
  persistData();
  return true;
}

async function removeCourt(courtId) {
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/courts/${courtId}`, { method: "DELETE" });
      await refreshPlatformReservations();
      lastActionMessage = "Kurt byl odebran a zmena je viditelna vsem hracum.";
      return true;
    } catch (error) {
      if (error.code === "last_court") lastActionMessage = "Klub musi mit alespon jeden aktivni kurt.";
      else if (error.code === "court_has_reservations") lastActionMessage = "Kurt ma aktivni rezervace. Nejdrive je presun nebo zrus.";
      else lastActionMessage = error.message;
      return false;
    }
  }
  const index = courts.findIndex((court) => court.id === courtId);
  if (index < 0 || courts.length <= 1) {
    lastActionMessage = "Klub musi mit alespon jeden aktivni kurt.";
    return false;
  }
  courts.splice(index, 1);
  courtPriceRules = courtPriceRules.filter((rule) => rule.court !== courtId);
  syncReservationCourtReferences();
  persistData();
  return true;
}

async function saveSpecialOccupancy() {
  const typeValue = document.querySelector("#specialTypeInput")?.value || "turnaj";
  const type = specialOccupancyTypes.find((item) => item.type === typeValue) || specialOccupancyTypes[0];
  const courtId = document.querySelector("#specialCourtInput")?.value || "all";
  const start = document.querySelector("#specialStartInput")?.value || club.open;
  const end = document.querySelector("#specialEndInput")?.value || minutesToTime(Math.min(timeToMinutes(club.close), timeToMinutes(start) + 120));
  const title = document.querySelector("#specialTitleInput")?.value?.trim() || type.label;
  const note = document.querySelector("#specialNoteInput")?.value?.trim() || `${type.label}: bezna rezervace neni dostupna.`;
  if (timeToMinutes(end) <= timeToMinutes(start)) return false;
  const isoDate = document.querySelector("#specialDateInput")?.value || selectedBookingIsoDate();
  const targets = courtId === "all" ? courts : courts.filter((court) => court.id === courtId);
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/court-blocks`, {
        method: "POST",
        body: JSON.stringify({
          courtIds: targets.map((court) => court.id),
          date: isoDate,
          start,
          end,
          blockType: type.type === "turnaj" ? "tournament" : type.type,
          title,
          note,
          color: type.color
        })
      });
      await refreshPlatformReservations();
      lastActionMessage = `${title} blokuje ${targets.length} ${targets.length === 1 ? "kurt" : "kurty"}.`;
      return true;
    } catch (error) {
      lastActionMessage = error.code === "booking_conflict" ? "Nektery vybrany kurt je v tomto case uz obsazeny." : error.message;
      return false;
    }
  }
  targets.forEach((court) => {
    court.reservations = court.reservations.filter((reservation) =>
      reservation.isoDate !== isoDate ||
      timeToMinutes(reservation.end) <= timeToMinutes(start) ||
      timeToMinutes(reservation.start) >= timeToMinutes(end)
    );
    court.reservations.push({
      isoDate,
      start,
      end,
      title,
      type: "special",
      specialType: type.type,
      note,
      color: type.color
    });
    court.reservations.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  });
  persistData();
  return true;
}

async function saveAdminEvent() {
  if (state.role !== "admin") return false;
  const title = document.querySelector("#eventTitleInput")?.value?.trim() || "Nova klubova akce";
  const eventDate = dateFromDateInput(document.querySelector("#eventDateInput")?.value || dateInputValue(appToday));
  const start = document.querySelector("#eventStartInput")?.value?.trim() || "10:00";
  const end = document.querySelector("#eventEndInput")?.value?.trim() || "14:00";
  const meta = `${formatPortalDate(eventDate)} ${start}-${end}`;
  const fee = document.querySelector("#eventFeeInput")?.value?.trim() || "Zdarma";
  const detail = document.querySelector("#eventDetailInput")?.value?.trim() || "Detail akce doplni spravce.";
  const visual = document.querySelector("#eventVisualInput")?.value || "rackets";
  const customImage = document.querySelector("#eventImageUrlInput")?.value?.trim();
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/events`, {
        method: "POST",
        body: JSON.stringify({
          eventType: visual === "singles" || visual === "doubles" ? "tournament" : visual === "rackets" || visual === "shoes" ? "demo" : "club",
          title,
          detail,
          date: dateToIso(eventDate),
          start,
          end,
          feeLabel: fee,
          imageUrl: customImage || eventThumbnail(visual).image
        })
      });
      await refreshPlatformEvents();
      lastActionMessage = `${title} je publikovana a hraci dostali oznameni.`;
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  const event = {
    id: `${visual}-${Date.now()}`,
    isoDate: dateToIso(eventDate),
    startTime: start,
    endTime: end,
    thumbnail: customImage || visual,
    status: "published",
    date: weekdayCodes[eventDate.getDay()] || "Akce",
    title,
    meta,
    detail,
    fee,
    registered: [],
    history: ""
  };
  events.unshift(event);
  notifyPlayersAboutEvent(event, "created");
  persistData();
  return true;
}

async function saveAdminEventDetails(eventId) {
  const event = events.find((item) => item.id === eventId);
  if (!event) return false;
  const title = document.querySelector("#adminEventTitleInput")?.value?.trim();
  const isoDate = document.querySelector("#adminEventDateInput")?.value;
  const start = document.querySelector("#adminEventStartInput")?.value;
  const end = document.querySelector("#adminEventEndInput")?.value;
  const fee = document.querySelector("#adminEventFeeInput")?.value?.trim();
  const thumbnail = document.querySelector("#adminEventThumbInput")?.value;
  const customImage = document.querySelector("#adminEventImageUrlInput")?.value?.trim();
  const history = document.querySelector("#adminEventHistoryInput")?.value?.trim();
  const detail = document.querySelector("#adminEventDetailInput")?.value?.trim() || event.detail || "";
  if (!title || !isoDate || !start || !end || timeToMinutes(end) <= timeToMinutes(start)) {
    lastActionMessage = "Zkontrolujte nazev, datum a cas akce.";
    return false;
  }
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/events/${eventId}`, {
        method: "PUT",
        body: JSON.stringify({
          eventType: event.eventType || "club",
          title,
          detail,
          date: isoDate,
          start,
          end,
          feeLabel: fee || "Zdarma",
          capacity: event.capacity || null,
          imageUrl: customImage || eventThumbnail(thumbnail).image
        })
      });
      await refreshPlatformEvents();
      lastActionMessage = "Akce byla ulozena.";
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  if (title) event.title = title;
  event.isoDate = isoDate;
  event.startTime = start;
  event.endTime = end;
  event.meta = `${formatPortalDate(dateFromIso(isoDate))} ${start}-${end}`;
  event.detail = detail;
  if (fee) event.fee = fee;
  if (customImage || thumbnail) event.thumbnail = customImage || thumbnail;
  if (history) event.history = history;
  persistData();
  return true;
}

async function dismissPlatformNotification(notificationId) {
  if (!notificationId) return false;
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/me/notifications/${notificationId}/dismiss`, { method: "POST" });
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  replaceArray(notifications, notifications.filter((item) => item.id !== notificationId));
  persistData();
  return true;
}

function updatePlayerDiscount(input) {
  const player = adminPlayerDirectory.find((item) => item.id === input.dataset.player);
  if (!player) return;
  const value = Number(input.value || 0);
  player.discount = value;
  player.baseDiscount = Math.max(0, value - (player.loyaltyDiscount || 0));
  if (player.id === "radim") {
    currentUser.discount = player.discount;
    currentUser.baseDiscount = player.baseDiscount;
  }
  const finalHourly = playerFinalPrice(240, player);
  document.querySelector("#discountValue")?.replaceChildren(document.createTextNode(`${value} %`));
  document.querySelector("#baseDiscountValue")?.replaceChildren(document.createTextNode(`${player.baseDiscount} % spravce + ${player.loyaltyDiscount} % vernost`));
  document.querySelector("#finalPriceValue")?.replaceChildren(document.createTextNode(`${formatMoney(finalHourly)}/h`));
}

async function saveAdminPlayer(playerId) {
  const player = adminPlayerDirectory.find((item) => item.id === playerId);
  if (!player) return false;
  const reason = document.querySelector("#discountReasonInput")?.value?.trim();
  const note = document.querySelector("#adminNoteInput")?.value?.trim();
  if (reason) player.discountReason = reason;
  if (note) player.adminNote = note;
  if (platformContext.enabled) {
    const membershipId = platformContext.membersByPersona.get(playerId);
    if (!membershipId) {
      lastActionMessage = "Hrac nema propojene klubove clenstvi.";
      return false;
    }
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/members/${membershipId}/profile`, {
        method: "PUT",
        body: JSON.stringify({
          accountType: player.accountType || "club",
          baseDiscountPct: Number(player.baseDiscount || 0),
          discountReason: reason || player.discountReason || "",
          adminNote: note || player.adminNote || ""
        })
      });
      lastActionMessage = `${player.name}: profil a sleva jsou ulozene.`;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  persistData();
  return true;
}

function slugifyPlayerId(value = "hrac") {
  const base = String(value || "hrac")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "hrac";
  let id = base;
  let index = 2;
  while (playerRecordById(id)) {
    id = `${base}-${index}`;
    index += 1;
  }
  return id;
}

function initialsFromName(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : (parts[0] || "H").slice(0, 2)).toUpperCase();
}

async function createAdminPlayerFromModal() {
  if (!isPrimaryClubAdmin()) return false;
  const name = document.querySelector("#newPlayerNameInput")?.value?.trim();
  const email = document.querySelector("#newPlayerEmailInput")?.value?.trim().toLowerCase();
  const password = document.querySelector("#newPlayerPasswordInput")?.value?.trim();
  if (!name || !email || !password) {
    lastActionMessage = "Vypln jmeno, e-mail a heslo noveho hrace.";
    return false;
  }
  if (accountByEmail(email)) {
    lastActionMessage = "Tento e-mail uz v portalu existuje.";
    return false;
  }
  const accountType = document.querySelector("#newPlayerTypeInput")?.value || "club";
  const role = document.querySelector("#newPlayerRoleInput")?.value || "player";
  const gender = document.querySelector("#newPlayerGenderInput")?.value || "male";
  const credit = Number(document.querySelector("#newPlayerCreditInput")?.value || 0);
  const baseDiscount = accountType === "guest" ? 0 : Number(document.querySelector("#newPlayerDiscountInput")?.value || 0);
  const id = slugifyPlayerId(email.split("@")[0] || name);
  let platformMember = null;
  if (platformContext.enabled) {
    try {
      const result = await platformRequest(`/api/v2/clubs/${platformContext.clubId}/members`, {
        method: "POST",
        body: JSON.stringify({ displayName: name, email, password, role, accountType, baseDiscountPct: baseDiscount })
      });
      platformMember = result.member;
      if (role === "player" && credit > 0) {
        await platformRequest(`/api/v2/clubs/${platformContext.clubId}/members/${platformMember.membershipId}/credit-topups`, {
          method: "POST",
          body: JSON.stringify({
            amountMinor: Math.round(credit * 100),
            paymentMethod: "other",
            note: "Pocatecni kredit pri zalozeni hrace",
            idempotencyKey: `new-member-${platformMember.membershipId}`
          })
        });
      }
    } catch (error) {
      lastActionMessage = error.code === "email_exists" ? "Tento e-mail uz ma ucet na platforme; pozvani do dalsiho klubu doplnime oddelene." : error.message;
      return false;
    }
  }
  if (role !== "player") {
    lastActionMessage = `${name} byl zalozen jako ${role === "manager" ? "spravce klubu" : role} a muze se prihlasit.`;
    return true;
  }
  const player = {
    id,
    name,
    initials: initialsFromName(name),
    relation: "club",
    gender,
    email,
    password,
    accountType,
    accountLabel: accountType === "guest" ? "Host" : accountType === "credit" ? "Kreditovy hrac" : "Klubovy hrac",
    age: null,
    credit,
    paidCredit: credit,
    bonusCredit: 0,
    discount: baseDiscount,
    baseDiscount,
    loyaltyDiscount: 0,
    playedHours: 0,
    nextLoyaltyHours: 50,
    discountReason: "Novy hrac zalozen spravcem.",
    seasonSpend: 0,
    seasonReservations: 0,
    adminNote: "Novy profil, doplnit poznamky po prvnich hrach.",
    invitedBy: "",
    level: "nezadano",
    type: "nezadano",
    time: "",
    reservationNeed: "",
    style: "nezadano",
    tournaments: "zadne",
    lastPlayed: "Zatim bez historie.",
    record: "0 zapasu"
  };
  players.push(player);
  adminPlayerDirectory.push(player);
  if (platformMember) platformContext.membersByPersona.set(id, platformMember.membershipId);
  persistData();
  lastActionMessage = `${name} byl zalozen a muze se prihlasit.`;
  return true;
}

function playerIdByDisplayName(name = "") {
  const normalized = name.toLowerCase();
  return adminPlayerDirectory.find((player) =>
    normalized.includes(player.name.toLowerCase()) ||
    normalized.includes(player.name.split(" ")[0].toLowerCase())
  )?.id || "radim";
}

function sendAdminInvite(playerName = "", court = "", time = "") {
  const playerId = playerIdByDisplayName(playerName);
  const id = `admin-invite-${Date.now()}-${playerId}`;
  notifications.push({
    id,
    type: "invite",
    recipients: [playerId],
    title: "Pozvanka od spravce",
    meta: `${court || "Volny kurt"} ${time || ""}. Spravce ti nabizi vhodny termin.`,
    status: "Ceka na odpoved"
  });
  persistData();
  return true;
}

async function saveCreditBonusRule(packageName = "") {
  let rule = creditBonusRules.find((item) => item.id === packageName || item.name === packageName);
  const name = document.querySelector("#creditBonusNameInput")?.value?.trim();
  const paid = Number(document.querySelector("#creditBonusPaidInput")?.value || rule?.paid || 0);
  const bonus = Number(document.querySelector("#creditBonusBonusInput")?.value || rule?.bonus || 0);
  const note = document.querySelector("#creditBonusNoteInput")?.value?.trim();
  if (!name || !Number.isFinite(paid) || paid <= 0 || !Number.isFinite(bonus) || bonus < 0) {
    lastActionMessage = "Vypln nazev, kladnou hranici platby a nezaporny bonus.";
    return false;
  }
  const duplicate = creditBonusRules.find((item) => item !== rule && Number(item.paid) === paid);
  if (duplicate) {
    lastActionMessage = `Pro castku ${formatMoney(paid)} uz pravidlo existuje.`;
    return false;
  }
  if (platformContext.enabled) {
    try {
      const endpoint = rule
        ? `/api/v2/clubs/${platformContext.clubId}/credit-rules/${rule.id}`
        : `/api/v2/clubs/${platformContext.clubId}/credit-rules`;
      const result = await platformRequest(endpoint, {
        method: rule ? "PUT" : "POST",
        body: JSON.stringify({
          label: name,
          thresholdMinor: Math.round(paid * 100),
          bonusMinor: Math.round(bonus * 100),
          note: note || "Bonus podle pravidel klubu."
        })
      });
      if (!rule) {
        rule = { id: result.rule.id, name, paid, bonus, note: note || "Bonus podle pravidel klubu." };
        creditBonusRules.push(rule);
      } else {
        Object.assign(rule, { name, paid, bonus, note: note || rule.note });
      }
      creditBonusRules.sort((left, right) => Number(left.paid) - Number(right.paid));
      lastActionMessage = `Pravidlo ${formatMoney(paid)} + ${formatMoney(bonus)} bonus je ulozene.`;
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  if (!rule) {
    rule = { id: `credit-rule-${Date.now()}`, name, paid, bonus, note: note || "Bonus podle pravidel klubu." };
    creditBonusRules.push(rule);
  } else {
    rule.name = name;
    rule.paid = paid;
    rule.bonus = bonus;
    rule.note = note || rule.note;
  }
  creditBonusRules.sort((left, right) => Number(left.paid) - Number(right.paid));
  lastActionMessage = `Pravidlo ${formatMoney(paid)} + ${formatMoney(bonus)} bonus je ulozene.`;
  persistData();
  return true;
}

async function deleteCreditBonusRule(ruleId = "") {
  const index = creditBonusRules.findIndex((item) => item.id === ruleId || item.name === ruleId);
  if (index < 0) return false;
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/credit-rules/${creditBonusRules[index].id}`, { method: "DELETE" });
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  creditBonusRules.splice(index, 1);
  persistData();
  return true;
}

async function applyManualCredit(playerId = "") {
  if (state.role !== "admin") return false;
  const player = playerRecordById(playerId);
  const preview = manualCreditPreview(document.querySelector("#manualCreditAmountInput")?.value);
  const method = document.querySelector("#manualCreditMethodInput")?.value || "cash";
  const note = document.querySelector("#manualCreditNoteInput")?.value?.trim() || "Rucni dobiti spravcem";
  const operationKey = document.querySelector("#manualCreditOperationInput")?.value || "";
  if (!player || preview.paid <= 0) {
    lastActionMessage = "Vyber hrace a zadej kladnou zaplacenou castku.";
    return false;
  }
  if (!operationKey || creditTransactions.some((transaction) => transaction.idempotencyKey === operationKey)) {
    lastActionMessage = "Tato platba uz byla zpracovana.";
    return false;
  }
  if (platformContext.enabled) {
    const membershipId = platformContext.membersByPersona.get(playerId);
    if (!membershipId) {
      lastActionMessage = "Hrac nema propojene klubove clenstvi.";
      return false;
    }
    try {
      const result = await platformRequest(`/api/v2/clubs/${platformContext.clubId}/members/${membershipId}/credit-topups`, {
        method: "POST",
        body: JSON.stringify({
          amountMinor: Math.round(preview.paid * 100),
          paymentMethod: method,
          note,
          idempotencyKey: operationKey
        })
      });
      player.paidCredit = Number(result.balance.paidMinor || 0) / 100;
      player.bonusCredit = Number(result.balance.bonusMinor || 0) / 100;
      player.credit = Number(result.balance.totalMinor || 0) / 100;
      creditTransactions.push({
        id: result.transaction.id,
        playerId: player.id,
        type: "topup",
        paid: Number(result.transaction.paidMinor || 0) / 100,
        bonus: Number(result.transaction.bonusMinor || 0) / 100,
        total: (Number(result.transaction.paidMinor || 0) + Number(result.transaction.bonusMinor || 0)) / 100,
        balanceAfter: player.credit,
        ruleId: result.transaction.rule?.id || "",
        ruleName: result.transaction.rule?.label || "Bez bonusu",
        method,
        note,
        createdBy: "Spravce",
        idempotencyKey: operationKey,
        createdAt: new Date().toISOString()
      });
      lastActionMessage = `${player.name}: pripsano ${formatMoney(result.transaction.paidMinor / 100)} + ${formatMoney(result.transaction.bonusMinor / 100)} bonus.`;
      return true;
    } catch (error) {
      lastActionMessage = error.code === "duplicate_topup" ? "Tato platba uz byla zpracovana." : error.message;
      return false;
    }
  }
  player.paidCredit = Number(player.paidCredit || 0) + preview.paid;
  player.bonusCredit = Number(player.bonusCredit || 0) + preview.bonus;
  player.credit = totalCredit(player);
  creditTransactions.push({
    id: `credit-${Date.now()}-${player.id}`,
    playerId: player.id,
    type: "topup",
    paid: preview.paid,
    bonus: preview.bonus,
    total: preview.total,
    balanceAfter: player.credit,
    ruleId: preview.rule?.id || "",
    ruleName: preview.rule?.name || "Bez bonusu",
    method,
    note,
    createdBy: "Spravce",
    idempotencyKey: operationKey,
    createdAt: new Date().toISOString()
  });
  notifications.push({
    id: `credit-topup-${Date.now()}-${player.id}`,
    type: "credit",
    recipients: [player.id],
    title: "Kredit pripsan",
    meta: `${formatMoney(preview.paid)} zaplaceno${preview.bonus ? ` + ${formatMoney(preview.bonus)} bonus` : ""}. Novy zustatek ${formatMoney(player.credit)}.`,
    status: "Hotovo"
  });
  if (player.id === currentPersonaId()) setCurrentPersona(player.id);
  lastActionMessage = `${player.name}: pripsano ${formatMoney(preview.paid)} + ${formatMoney(preview.bonus)} bonus.`;
  persistData();
  return true;
}

function sendHabitAlert(playerName = "", time = "") {
  const playerId = playerIdByDisplayName(playerName);
  notifications.push({
    id: `habit-alert-${Date.now()}-${playerId}`,
    type: "invite",
    recipients: [playerId],
    title: "Volny termin podle tveho navyku",
    meta: `${time || "Volny termin"}. Portal nasel cas, ktery se podoba tvemu beznemu hrani.`,
    status: "Ceka na odpoved"
  });
  persistData();
  return true;
}

function prepareSalesCampaign(campaignTitle = "") {
  const campaign = salesCampaigns.find((item) => item.title === campaignTitle) || salesCampaigns[0];
  if (!campaign) return false;
  const existing = events.find((event) => event.title === campaign.title);
  const event = existing || {
    id: `shop-${Date.now()}`,
    thumbnail: "shop",
    date: campaign.date?.split(" ")[0] || "Akce",
    title: campaign.title,
    meta: `${campaign.date} · ${campaign.partner}`,
    detail: `Partnerska prodejni akce: ${campaign.weather}, ${campaign.occupancy}. ${campaign.revenue}`,
    fee: "Zdarma",
    registered: [],
    history: ""
  };
  if (!existing) events.unshift(event);
  persistData();
  return true;
}

function launchProductPoll(product = "") {
  const item = productPollItems.find((poll) => poll.product === product) || productPollItems[0];
  if (!item) return false;
  item.votes = Number(item.votes || 0) + 1;
  item.weighted = Number(item.weighted || 0) + 2;
  item.status = "anketa spustena";
  notifications.push({
    id: `product-poll-${Date.now()}`,
    type: "event-invite",
    recipients: players.slice(0, 5).map((player) => player.id),
    title: "Anketa sortimentu",
    meta: `Hlasuj, jestli chceš na klubu vyzkoušet ${item.product}.`,
    status: "Nova anketa",
    eventId: events[0]?.id
  });
  persistData();
  return true;
}

function createPlayerSearch() {
  const playerId = currentPersonaId();
  const player = players.find((item) => item.id === playerId) || adminPlayerDirectory.find((item) => item.id === playerId);
  if (!player) return false;
  const gameType = document.querySelector("#findGameType")?.value || "double";
  const dayIndex = Number(document.querySelector("#findDayInput")?.value || state.selectedDay);
  const start = document.querySelector("#findTimeInput")?.value || "18:00";
  const duration = Number(document.querySelector("#findDurationInput")?.value || 90);
  const end = minutesToTime(Math.min(timeToMinutes(club.close), timeToMinutes(start) + duration));
  player.reservationNeed = `${days[dayIndex]} ${start}-${end}, ${gameType === "single" ? "hleda dvouhru" : "chybi hraci do ctyrhry"}`;
  player.type = gameType === "single" ? "dvouhra" : "ctyrhra";
  player.time = start;
  persistData();
  return true;
}

function confirmAttendanceFromNotification(notificationId = "attendance-main") {
  const playerId = currentPersonaId();
  const index = notifications.findIndex((item) =>
    item.id === notificationId ||
    (item.type === "attendance" && item.recipients?.includes(playerId)) ||
    (item.title === "Potvrdit ucast" && item.recipients?.includes(playerId))
  );
  let notification = notifications[index];
  if (!notification && notificationId.startsWith("generated-attendance-")) {
    const reservationIndex = Number(notificationId.split("-").at(-1));
    notification = { id: notificationId, type: "attendance", generated: true, recipients: [playerId], reservationIndex };
  }
  if (!notification) return false;
  const reservation = personalReservations[notification.reservationIndex || 0];
  if (reservation?.attendance) {
    const me = reservation.attendance.find((player) => normalizeAttendancePlayer(player).playerId === playerId);
    if (me) {
      me.status = "confirmed";
      me.role = "potvrzeno mnou";
    }
  }
  if (!notification.generated) notifications.splice(0, notifications.length, ...notifications.filter((item) =>
    item.id !== notification.id &&
    !(item.type === "attendance" && item.reservationIndex === notification.reservationIndex && item.recipients?.includes(playerId))
  ));
  persistData();
  return true;
}

function declineAttendanceFromNotification(notificationId = "attendance-main") {
  let notification = notifications.find((item) => item.id === notificationId || (item.type === "attendance" && item.recipients?.includes(currentPersonaId())));
  if (!notification && notificationId.startsWith("generated-attendance-")) {
    const reservationIndex = Number(notificationId.split("-").at(-1));
    notification = { id: notificationId, type: "attendance", generated: true, recipients: [currentPersonaId()], reservationIndex };
  }
  if (!notification) return false;
  const reservationIndex = Number(notification.reservationIndex || 0);
  const reservation = personalReservations[reservationIndex];
  const playerId = currentPersonaId();
  if (reservation?.attendance) {
    const me = reservation.attendance.find((player) => normalizeAttendancePlayer(player).playerId === playerId);
    if (me) {
      me.status = "declined";
      me.role = "nemuze";
    }
  }
  notifications.splice(0, notifications.length, ...notifications.filter((item) =>
    item.id !== notification.id &&
    !(item.type === "attendance" && item.reservationIndex === reservationIndex && item.recipients?.includes(playerId))
  ));
  const active = reservation ? normalizedAttendance(reservation).filter(activeForGame) : [];
  if (reservation && active.length === 0) {
    reservation.status = "cancelled";
    courts.forEach((court) => {
      court.reservations = court.reservations.filter((slot) => slot.reservationId !== reservation.id);
    });
    notifications.splice(0, notifications.length, ...notifications.filter((item) => item.reservationIndex !== reservationIndex));
  } else {
    startReplacementVote(reservationIndex, playerId);
    refreshReservationLineup(reservationIndex);
  }
  persistData();
  return true;
}

function attendanceFromPlayerId(playerId, status = "confirmed", role = "potvrdil") {
  const record = playerRecordById(playerId) || currentUser;
  return {
    name: (record.name || "").split(" ")[0],
    initials: record.initials,
    playerId,
    gender: ["handa", "viki"].includes(playerId) ? "female" : "male",
    status,
    role
  };
}

function proposalToReservation(proposal) {
  const parsed = parseProposalTime(proposal.title);
  const start = parsed?.start || "17:00";
  const end = parsed?.end || "18:30";
  const court = courtFromLabel(proposal.court);
  const invited = proposal.sentTo.map((player) => {
    const normalized = normalizeAttendancePlayer(player);
    return {
      name: normalized.name.split(" ")[0],
      initials: normalized.initials,
      playerId: normalized.playerId,
      gender: normalized.gender,
      status: player.status === "confirmed" ? "confirmed" : player.status === "declined" ? "declined" : "pending",
      role: player.status === "confirmed" ? "potvrdil" : player.status === "declined" ? "nemuze" : "ceka"
    };
  });
  if (proposal.ownerId && !invited.some((player) => player.playerId === proposal.ownerId)) {
    invited.unshift(attendanceFromPlayerId(proposal.ownerId, "active", "zalozil hru"));
  }
  const isoDate = proposal.isoDate || parsed?.isoDate || nextIsoDateForDay(parsed?.day || "Dnes");
  const date = dateFromIso(isoDate) || selectedBookingDateObject();
  return {
    id: `reservation-${Date.now()}-${proposal.ownerId || "player"}`,
    isoDate,
    day: weekdayCodes[date.getDay()],
    date: String(date.getDate()),
    month: date.getMonth(),
    year: date.getFullYear(),
    start,
    end,
    kind: "Domluvena",
    gameType: proposal.gameType || (invited.length <= 2 ? "single" : "double"),
    court,
    players: invited.map((player) => player.name),
    attendance: invited
  };
}

function addReservationToSchedules(reservation) {
  const target = reservationTargetPlayers(reservation);
  const activeCount = normalizedAttendance(reservation).filter(activeForGame).length;
  const type = activeCount >= target ? "mine" : "group";
  if (!reservation.court.reservations.some((slot) => slot.reservationId === reservation.id)) {
    reservation.court.reservations.push({
      isoDate: reservationIsoDate(reservation),
      start: reservation.start,
      end: reservation.end,
      title: reservation.gameType === "single" ? "Dvouhra" : "Ctyrhra",
      type,
      reservationId: reservation.id,
      players: normalizedAttendance(reservation).filter(activeForGame).map((player) => player.name)
    });
    reservation.court.reservations.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  }
  if (!adminReservations.some((item) => item.reservationId === reservation.id)) {
    adminReservations.unshift({
      reservationId: reservation.id,
      time: `${reservationDateLabel(reservation)} ${reservation.start}-${reservation.end}`,
      court: reservation.court.name,
      surface: reservation.court.surface,
      owner: playerRecordById(normalizedAttendance(reservation)[0]?.playerId)?.name || normalizedAttendance(reservation)[0]?.name || "Hrac",
      status: activeCount >= target ? "Plna sestava" : "Hleda hrace",
      players: `${activeCount}/${target}`,
      tone: activeCount >= target ? "good" : "warn"
    });
  }
}

function confirmGameProposal(index = 0) {
  lastActionMessage = "";
  const proposal = gameProposals[index];
  if (!proposal) return false;
  const playerId = currentPersonaId();
  const invited = proposal.sentTo.find((player) => (player.playerId || playerRecordByNameOrInitials(player)?.id) === playerId);
  if (invited && proposal.ownerId !== playerId) {
    const parsed = parseProposalTime(proposal.title);
    const isoDate = proposal.isoDate || (parsed ? nextIsoDateForDay(parsed.day) : selectedBookingIsoDate());
    if (parsed && playerHasTimeCollision(playerId, parsed.day, isoDate, parsed.start, parsed.end)) {
      lastActionMessage = "Tento navrh se kryje s jinou tvoji rezervaci. Posli protinavrh na jiny cas.";
      return false;
    }
    invited.status = "confirmed";
  }
  const target = (proposal.gameType || "double") === "single" ? 2 : 4;
  const confirmedCount = 1 + proposal.sentTo.filter((player) => player.status === "confirmed").length;
  if (confirmedCount >= target) {
    const reservation = proposalToReservation(proposal);
    personalReservations.unshift(reservation);
    addReservationToSchedules(reservation);
    gameProposals.splice(index, 1);
    notifications.splice(0, notifications.length, ...notifications.filter((item) => item.proposalIndex !== index && item.proposalId !== proposal.id));
    lastActionMessage = "Navrh je potvrzeny a hra byla zapsana do rezervaci i rozvrhu kurtu.";
  } else {
    lastActionMessage = "Ucast je potvrzena. Ceka se na doplneni sestavy.";
  }
  persistData();
  return true;
}

async function confirmGameProposalById(proposalId) {
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/reservations/${proposalId}/respond`, {
        method: "POST",
        body: JSON.stringify({ response: "accept" })
      });
      await refreshPlatformReservations();
      lastActionMessage = "Ucast je potvrzena.";
      return true;
    } catch (error) {
      lastActionMessage = error.message;
      return false;
    }
  }
  const index = gameProposals.findIndex((proposal) => proposal.id === proposalId);
  if (index < 0) return false;
  const ok = confirmGameProposal(index);
  notifications.splice(0, notifications.length, ...notifications.filter((item) => !(item.proposalId === proposalId && item.recipients?.includes(currentPersonaId()))));
  persistData();
  return ok;
}

function acceptReplacementCandidate(reservationIndex = 3, candidateId = "") {
  lastActionMessage = "";
  const reservation = personalReservations[reservationIndex];
  if (!reservation?.attendance) return false;
  const vote = notifications.find((item) =>
    item.type === "replacement" &&
    item.reservationIndex === Number(reservationIndex) &&
    (!candidateId || item.candidateId === candidateId)
  );
  if (vote) {
    vote.votes = vote.votes || {};
    vote.votes[currentPersonaId()] = candidateId || vote.candidateId;
  }
  const voteCount = vote ? Object.values(vote.votes || {}).filter((id) => id === (candidateId || vote.candidateId)).length : 999;
  const requiredVotes = vote ? Math.max(1, Math.ceil((vote.recipients?.length || 1) / 2)) : 1;
  if (vote && voteCount < requiredVotes) {
    vote.status = `${voteCount}/${requiredVotes} hlasu`;
    lastActionMessage = `Hlas je ulozeny. K vyberu nahradnika chybi ${requiredVotes - voteCount} hlas.`;
    persistData();
    return true;
  }
  const replacement = reservation.attendance.find((player) =>
    normalizeAttendancePlayer(player).playerId === candidateId ||
    player.status === "candidate" ||
    player.status === "replacement"
  );
  if (replacement) {
    replacement.status = "replacement";
    replacement.role = "vybran hlasovanim";
  }
  reservation.players = normalizedAttendance(reservation).filter(activeForGame).map((player) => player.name);
  const linked = courtReservationById(reservation.id);
  if (linked) {
    linked.reservation.players = [...reservation.players];
    linked.reservation.type = "mine";
    linked.reservation.title = reservation.gameType === "single" ? "Dvouhra potvrzena" : "Ctyrhra potvrzena";
  }
  const admin = adminReservations.find((item) => item.reservationId === reservation.id);
  if (admin) {
    admin.status = "Plna sestava";
    admin.players = `${reservation.players.length}/${reservationTargetPlayers(reservation)}`;
    admin.tone = "good";
  }
  notifications.splice(0, notifications.length, ...notifications.filter((item) =>
    !(item.type === "replacement" && item.reservationIndex === Number(reservationIndex))
  ));
  lastActionMessage = "Nahradnik byl vybran hlasovanim a sestava je znovu kompletni.";
  persistData();
  return true;
}

function render() {
  const playerViews = {
    home: renderHome,
    booking: renderBooking,
    players: renderPlayers,
    events: renderEvents,
    orders: renderPlayerOrders,
    profile: renderProfile
  };
  const adminViews = {
    home: renderAdminOverview,
    booking: renderAdminReservations,
    players: renderAdminPlayers,
    events: renderAdminEvents,
    orders: renderAdminOrders,
    profile: renderAdminSettings
  };
  const guestViews = {
    home: renderGuestHome,
    booking: renderGuestHome,
    players: renderGuestHome,
    events: renderGuestHome,
    profile: renderGuestHome
  };
  const stringerViews = {
    home: renderStringerHome,
    booking: renderStringerHome,
    players: renderStringerHome,
    events: renderStringerHome,
    profile: renderStringerHome
  };
  const sellerViews = {
    home: renderSellerHome,
    booking: renderSellerHome,
    players: renderSellerHome,
    events: renderSellerHome,
    profile: renderSellerHome
  };
  const views = state.role === "admin"
    ? adminViews
    : state.role === "guest"
      ? guestViews
      : state.role === "stringer"
        ? stringerViews
        : state.role === "seller"
          ? sellerViews
          : playerViews;
  const view = views[state.view] ? state.view : "home";

  content.innerHTML = views[view]();
  renderNavigation();
  applyAvatarPhotos(content);
  updateRoleSwitcherVisibility();
  updateAppBadge();
  if (activeHelpTour) window.setTimeout(showHelpTourStep, 0);
}

function legacyRenderNavigationA() {
  applyClubBranding();
  const limitedRole = ["guest", "stringer", "seller"].includes(state.role);
  const navItems = state.role === "admin"
    ? [
        { view: "home", icon: "⌂", label: "Prehled" },
        { view: "booking", icon: "▦", label: "Rezervace" },
        { view: "players", icon: "◌", label: "Hraci" },
        { view: "events", icon: "◇", label: "Akce" },
        { view: "profile", icon: "○", label: "Nastaveni" }
      ]
    : limitedRole
      ? [
          { view: "home", icon: "⌂", label: state.role === "guest" ? "Host" : state.role === "stringer" ? "Vypletac" : "Obchod" },
          { view: "booking", icon: "□", label: "Tok" },
          { view: "players", icon: "○", label: "Kontakty" },
          { view: "events", icon: "◇", label: "Akce" },
          { view: "profile", icon: "○", label: "Profil" }
        ]
    : [
        { view: "home", icon: "⌂", label: "Domu" },
        { view: "booking", icon: "▦", label: "Rezervace" },
        { view: "players", icon: "◌", label: "Hraci" },
        { view: "events", icon: "◇", label: "Akce" },
        { view: "profile", icon: "○", label: "Profil" }
      ];

  document.querySelectorAll(".nav-item").forEach((button) => {
    const item = navItems.find((navItem) => navItem.view === button.dataset.view);
    if (item) {
      button.querySelector(".nav-icon").textContent = "";
      button.querySelector("span:last-child").textContent = item.label;
    }
    button.classList.toggle("active", button.dataset.view === state.view);
  });
  document.querySelectorAll(".role-option").forEach((button) => {
    const sameRole = button.dataset.role === state.role;
    const samePersona = !button.dataset.persona || button.dataset.persona === state.persona;
    button.classList.toggle("active", sameRole && samePersona);
  });
  const creditBadge = document.querySelector("#creditBadge");
  if (creditBadge) creditBadge.textContent = state.role === "guest" ? "Neprihlasen" : formatMoney(currentUser.credit, currentUser.currency);
  const headerName = document.querySelector(".topbar .muted");
  if (headerName) headerName.textContent = state.role === "guest" ? "Hostovsky rezim" : state.role === "admin" ? adminHeaderLabel() : state.role === "stringer" ? "Vypletac raket" : state.role === "seller" ? "Partner obchodu" : `Ahoj, ${currentUser.name.split(" ")[0]}`;
  const loginInitials = document.querySelector("#loginButton span");
  if (loginInitials) loginInitials.innerHTML = state.role === "guest" ? "H" : state.role === "admin" ? "S" : state.role === "stringer" ? "V" : state.role === "seller" ? "O" : avatarContent(currentUser);
  const clubHoursLabel = document.querySelector("#clubHoursLabel");
  if (clubHoursLabel) clubHoursLabel.textContent = `${club.open}-${club.close}`;
}

function legacyRenderNavigationB() {
  const limitedRole = ["guest", "stringer", "seller"].includes(state.role);
  const navItems = state.role === "admin"
    ? [
        { view: "home", label: "Domu" },
        { view: "booking", label: "Rezervace" },
        { view: "players", label: "Hraci" },
        { view: "events", label: "Akce" },
        { view: "orders", label: "Objednavky", badge: visiblePlayerOrders().filter(orderNeedsAction).length, image: "assets/order-cart-icon.png" },
        { view: "profile", label: "Profil" }
      ]
    : limitedRole
      ? [
          { view: "home", label: state.role === "guest" ? "Host" : state.role === "stringer" ? "Vypletac" : "Obchod" },
          { view: "booking", label: "Tok" },
          { view: "players", label: "Kontakty" },
          { view: "events", label: "Akce" },
          { view: "profile", label: "Profil" }
        ]
      : [
          { view: "home", label: "Domu" },
          { view: "booking", label: "Rezervace" },
          { view: "players", label: "Hraci" },
          { view: "events", label: "Akce" },
          { view: "profile", label: "Profil" }
        ];
  const navEl = document.querySelector(".bottom-nav");
  if (navEl) {
    navEl.classList.toggle("admin-nav", state.role === "admin");
    navEl.innerHTML = navItems.map((item) => `
      <button class="nav-item ${item.view === state.view ? "active" : ""}" data-view="${item.view}">
        <span class="nav-icon">${item.image ? `<img src="${item.image}" alt="">` : ""}${item.badge ? `<i class="nav-badge">${item.badge}</i>` : ""}</span>
        <span>${item.label}</span>
      </button>
    `).join("");
  }
  document.querySelectorAll(".role-option").forEach((button) => {
    const sameRole = button.dataset.role === state.role;
    const samePersona = !button.dataset.persona || button.dataset.persona === state.persona;
    button.classList.toggle("active", sameRole && samePersona);
  });
  const creditBadge = document.querySelector("#creditBadge");
  if (creditBadge) creditBadge.textContent = state.role === "guest" ? "Neprihlasen" : formatMoney(currentUser.credit, currentUser.currency);
  const headerName = document.querySelector(".topbar .muted");
  if (headerName) headerName.textContent = state.role === "guest" ? "Hostovsky rezim" : state.role === "admin" ? adminHeaderLabel() : state.role === "stringer" ? "Vypletac raket" : state.role === "seller" ? "Partner obchodu" : `Ahoj, ${currentUser.name.split(" ")[0]}`;
  const loginInitials = document.querySelector("#loginButton span");
  if (loginInitials) loginInitials.innerHTML = state.role === "guest" ? "H" : state.role === "admin" ? "S" : state.role === "stringer" ? "V" : state.role === "seller" ? "O" : avatarContent(currentUser);
  const clubHoursLabel = document.querySelector("#clubHoursLabel");
  if (clubHoursLabel) clubHoursLabel.textContent = `${club.open}-${club.close}`;
}

function legacyRenderHome() {
  const nextReservation = nextVisibleReservation();
  return `
    <section class="view">
      <div class="status-grid">
        <div class="metric"><strong>${club.open}</strong><span>Otevreno od</span></div>
        <div class="metric"><strong>${nextReservation ? nextReservation.start : "-"}</strong><span>${nextReservation ? nextReservation.court.name : "Bez rezervace"}</span></div>
        <div class="metric"><strong>${formatMoney(currentUser.credit, currentUser.currency)}</strong><span>Muj kredit</span></div>
      </div>

      <div class="quick-actions">
        <button class="quick-action primary" data-action="book">Rezervovat</button>
        <button class="quick-action" data-action="find-player">Najit hrace</button>
        <button class="quick-action" data-action="cancel">Zrusit termin</button>
      </div>

      ${notificationCenter()}
      ${gameProposalSection()}
      ${myReservationSummary()}
      ${playerOrdersSection()}
      ${courtDayOverview()}

      <section class="section">
        <div class="section-head">
          <h2 class="title-with-icon"><span class="ui-icon players-icon"></span>Hledaji hrace</h2>
          <button class="link-button" data-view-link="players">Otevrit</button>
        </div>
        ${playerList(players.slice(0, 2))}
      </section>

      <section class="section">
        <div class="section-head">
          <h2 class="title-with-icon"><span class="ui-icon event-icon"></span>Akce klubu</h2>
          <button class="link-button" data-view-link="events">Vse</button>
        </div>
        ${eventList(events.slice(0, 2))}
      </section>
      ${clubShopSection()}
    </section>
  `;
}

function renderGuestHome() {
  return `
    <section class="view">
      <section class="section guest-entry" data-help-target="guest-entry">
        <div class="section-head">
          <div>
            <h2>Prihlaseni do portalu</h2>
            <p class="muted">Pro rezervace, pozvanky a zpravy se prihlas svym testovacim e-mailem.</p>
          </div>
          <span class="pill">hrac / spravce</span>
        </div>
        <button class="primary-button" data-action="login">Prihlasit hrace</button>
      </section>
      <section class="section guest-entry">
        <div class="section-head">
          <div>
            <h2>Hostovska rezervace</h2>
            <p class="muted">Minimum kroku: telefon nebo e-mail, jednorazovy kod, vyber slotu a uhrada podle pravidel klubu.</p>
          </div>
          <span class="pill">bez uctu</span>
        </div>
        <div class="guest-steps">
          <div><strong>1</strong><span>Kontakt</span></div>
          <div><strong>2</strong><span>Slot</span></div>
          <div><strong>3</strong><span>Klub</span></div>
        </div>
        <button class="secondary-button" data-action="guest">Zacit jako host</button>
      </section>
      <div data-help-target="guest-courts">${courtDayOverview()}</div>
    </section>
  `;
}

function renderStringerHome() {
  const activeOrders = stringingOrders.filter((order) => order.status !== "delivered" && order.status !== "cancelled");
  return `
    <section class="view">
      <section class="section stringer-entry">
        <div class="section-head" data-help-target="service-work">
          <div>
            <h2>Vypletac raket</h2>
            <p class="muted">Sbery raket, terminy do dalsi rezervace a zpravy hracum.</p>
          </div>
          <span class="pill">test role</span>
        </div>
        <div class="order-list">
          ${activeOrders.map((order) => `
            <article class="order-card">
              <span>
                <strong>${order.player}</strong>
                <small>${order.racket} · ${order.string} · ${order.tension}</small>
                <small>${order.statusLabel} · ${order.due}</small>
                <small>${order.note}</small>
              </span>
              <div class="inline-actions">
                ${order.status === "at_club" ? `<button class="secondary-button" data-confirm="stringing-pickup" data-stringing="${order.id}">Prevzit z klubu</button>` : ""}
                ${order.status === "with_stringer" ? `<button class="primary-button" data-confirm="stringing-returned" data-stringing="${order.id}">Vratit klubu</button>` : ""}
              </div>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="section soft">
        <div class="section-head">
          <h2>Logika servisu</h2>
          <span class="pill">automaticky</span>
        </div>
        <div class="profile-list">
          <div class="profile-row"><span>Objednavka hrace</span><span>automaticky vytvori ukol vypletaci</span></div>
          <div class="profile-row"><span>Spravce</span><span>vidi prehled a klub raketu nachysta hraci na recepci</span></div>
          <div class="profile-row"><span>Hotovo</span><span>vypletac vraci klubu, hraci prijde zprava k vyzvednuti pred hrou</span></div>
        </div>
      </section>
    </section>
  `;
}

function renderSellerHome() {
  const requests = sellerEvents();
  return `
    <section class="view">
      <section class="section seller-entry">
        <div class="section-head" data-help-target="service-work">
          <div>
            <h2>Partner obchodu</h2>
            <p class="muted">Baliky objednavek, akce v klubu a poptavky podle hlasovani hracu.</p>
          </div>
          <span class="pill">B2B</span>
        </div>
        <div class="order-list">
          ${requests.length ? requests.map((event) => `
            <button class="order-card" data-action="seller-event" data-event="${event.id}">
              <span>
                <strong>${event.title}</strong>
                <small>${event.requestedDate || event.meta} · ${event.sellerStatus || "ceka na obchodnika"}</small>
                <small>${event.detail}</small>
              </span>
              <b>${event.status === "seller_confirmed" ? "potvrzeno" : "resit"}</b>
            </button>
          `).join("") : `<article class="order-card"><strong>Zadne pozadavky</strong><small>Jakmile spravce ukonci anketu, objevi se tady navrh testovaci akce.</small></article>`}
        </div>
      </section>
      ${clubShopSection()}
    </section>
  `;
}

function legacyClubShopSection() {
  return `
    <section class="section shop-section">
      <div class="section-head">
        <div>
          <h2 class="title-with-icon"><span class="ui-icon shop-icon"></span>Klubovy obchod</h2>
          <p class="muted">Nakup a objednavky i mimo akce. Portal je spoji s rezervaci, vyzvednutim na klubu nebo nejblizsi prezentaci.</p>
        </div>
        <span class="pill">B2B ceny</span>
      </div>
      <div class="shop-hero">
        <div>
          <strong>Vybaveni bez hledani po e-shopech</strong>
          <small>Micky, boty, tricka, rakety a vyplety pripravene podle rezervaci, turnaju a hlasovani hracu.</small>
        </div>
      </div>
      <div class="shop-grid">
        ${clubShopItems.map((item) => `
          <button class="shop-card" data-action="product-order" data-product="${item.title}">
            <span>
              <strong>${item.title}</strong>
              <small>${item.type} · ${item.delivery}</small>
              <small>${item.note}</small>
            </span>
            <b>${item.price}</b>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function playerOrdersSection() {
  const orders = visiblePlayerOrders();
  if (!orders.length) return "";
  return `
    <section class="section orders-section">
      <div class="section-head">
        <div>
          <h2 class="title-with-icon"><span class="ui-icon shop-icon"></span>Moje objednavky</h2>
          <p class="muted">Veci, ktere mas pripravene k rezervaci, vyzvednuti nebo akci.</p>
        </div>
        <span class="pill">${orders.length}</span>
      </div>
      <div class="order-list">
        ${orders.map((order) => `
          <button class="order-card player-order-card" data-action="order-detail" data-order="${order.id || order.product}">
            <span>
              <strong>${order.product}</strong>
              <small>${orderDeliveryLabel(order)}</small>
              <small>${order.note || order.batch}</small>
            </span>
            <b>${order.status}</b>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function legacyGameProposalSection() {
  const collapsed = state.collapsedSections.has("proposals");
  const proposals = visibleGameProposals();
  return `
    <section class="section compact-panel ${collapsed ? "is-collapsed" : ""}">
      <div class="section-head">
        <div>
          <h2 class="title-with-icon"><span class="ui-icon proposal-icon"></span>Moje navrhy na hru</h2>
          <p class="muted">Vidis komu jsi navrh poslal, kdo potvrdil a kdo poslal protinavrh.</p>
        </div>
        <div class="section-tools">
          <button class="link-button" data-toggle-section="proposals">${collapsed ? "Rozbalit" : "Sbalit"}</button>
          <button class="link-button" data-action="invite">Novy navrh</button>
        </div>
      </div>
      <div class="proposal-list collapsible-content">
        ${proposals.length ? proposals.map((proposal) => {
          const index = gameProposals.indexOf(proposal);
          const isOwner = proposal.ownerId === currentPersonaId();
          return `
          <article class="proposal-card">
            <div>
              <strong>${proposal.title}</strong>
              <small>${proposal.court} · ${isOwner ? "muj navrh" : "pozvanka pro me"}</small>
            </div>
            <div class="proposal-players">
              ${proposal.sentTo.map((player) => `<span class="avatar tiny-avatar status-${player.status} ${playerGenderClass(player)}" title="${player.name}">${player.initials}</span>`).join("")}
            </div>
            <p>${proposal.state}</p>
            <small>${proposal.note}</small>
            <div class="inline-actions">
          <button class="secondary-button" data-action="counter" data-proposal-id="${proposal.id}">Navrhnout jiny cas</button>
              <button class="primary-button" data-confirm="invite-game" data-proposal="${index}">${isOwner ? "Vytvorit rezervaci" : "Potvrdit ucast"}</button>
            </div>
          </article>
        `}).join("") : `<article class="history-card"><strong>Zadne aktivni navrhy</strong><small>Domluvene hry se automaticky presunuly do Moje rezervace.</small></article>`}
      </div>
    </section>
  `;
}

function legacyNotificationCenter() {
  const visible = visibleNotifications();
  const attendanceNotice = visible.find((item) => item.type === "attendance" && item.status !== "Tvoje ucast potvrzena");
  const collapsed = state.collapsedSections.has("notifications");
  return `
    <section class="section soft compact-panel ${collapsed ? "is-collapsed" : ""}">
      <div class="section-head">
        <div>
          <h2 class="title-with-icon"><span class="ui-icon notification-icon"></span>Oznameni</h2>
          <p class="muted">Pripominky rezervaci, potvrzeni ucasti, omluvy a nahradnici.</p>
        </div>
        <div class="section-tools">
          <button class="link-button" data-toggle-section="notifications">${collapsed ? "Rozbalit" : "Sbalit"}</button>
          <span class="pill">${state.notificationsEnabled ? "zapnuto" : "vypnuto"}</span>
        </div>
      </div>
      <div class="notification-list collapsible-content">
        ${visible.length ? visible.map((item) => `
          <button class="notification-row row-button notification-${item.type || (item.id.includes("replacement") ? "replacement" : item.id.includes("counter") ? "invite" : "attendance")}" data-action="notification-detail" data-notification="${item.id}">
            <span>
              <strong>${item.title}</strong>
              <small>${item.meta}</small>
            </span>
            <b>${item.status}</b>
          </button>
        `).join("") : `<div class="notification-row"><span><strong>Vse potvrzeno</strong><small>Zadna nova oznameni.</small></span><b>klid</b></div>`}
      </div>
      <div class="inline-actions collapsible-content">
        <button class="secondary-button" data-action="remind">Upozornit sestavu</button>
        ${attendanceNotice ? `<button class="primary-button" data-confirm="attendance" data-notification="${attendanceNotice.id}">Potvrdit ucast</button>` : `<button class="primary-button" data-action="remind">Vse je potvrzene</button>`}
      </div>
    </section>
  `;
}

function freeCourtCard(item) {
  return `
    <button class="free-court-card ${item.court.surfaceClass}" data-action="book" data-court="${item.court.name}" data-time="${item.start}">
      <img src="${item.court.photo}" alt="${item.court.name}">
      <span>
        <strong>${item.court.name}</strong>
        <small>${item.court.surface} · ${item.start} · ${item.duration}</small>
      </span>
      <b>Vybrat</b>
    </button>
  `;
}

function myReservationSummary(showCalendar = true) {
  const joined = visibleJoinedEvents();
  const reservations = visibleReservations();
  return `
    <section class="section">
      <div class="section-head" data-help-target="player-reservations">
        <div>
          <h2 class="title-with-icon"><span class="ui-icon reservation-icon-small"></span>Moje rezervace</h2>
          <p class="muted">Tydni prehled, stala sestava a rychla rezervace z kalendare.</p>
        </div>
        <span class="pill">${reservations.length + joined.length} polozky</span>
      </div>

      <div class="reservation-stack">
        ${reservations.map((reservation) => reservationCard(reservation)).join("")}
        ${joined.map((event) => eventCalendarCard(event)).join("")}
      </div>
      <div class="status-legend">
        <span><i class="status-active"></i>Aktivni ve hre</span>
        <span><i class="status-confirmed"></i>Potvrdil</span>
        <span><i class="status-pending"></i>Ceka</span>
        <span><i class="status-declined"></i>Zrusil</span>
      </div>

      ${showCalendar ? monthCalendar("Moje rezervace v mesici", joined) : ""}
    </section>
  `;
}

function monthCalendar(title = "Kalendar", joined = []) {
  const cells = calendarCells(state.calendarYear, state.calendarMonth);
  return `
    <div class="month-calendar">
      <div class="calendar-head">
        <button class="month-button" data-month-delta="-1" aria-label="Predchozi mesic">‹</button>
        <strong>${monthName(state.calendarYear, state.calendarMonth)}</strong>
        <button class="month-button" data-month-delta="1" aria-label="Dalsi mesic">›</button>
      </div>
      <div class="calendar-subhead">
        <span>${title}</span>
        <button class="link-button" data-action="book">Nova rezervace</button>
      </div>
      <div class="calendar-weekdays"><span>Po</span><span>Ut</span><span>St</span><span>Ct</span><span>Pa</span><span>So</span><span>Ne</span></div>
      <div class="calendar-grid">
        ${cells.map((day) => calendarDay(day, joined)).join("")}
      </div>
    </div>
  `;
}

function legacyReservationCard(reservation) {
  const minutes = timeToMinutes(reservation.end) - timeToMinutes(reservation.start);
  const hours = minutes / 60;
  const attendance = reservation.attendance || reservation.players.map((name) => ({
    name,
    initials: name.slice(0, 2),
    status: "confirmed",
    role: "potvrdil"
  }));
  const targetPlayers = reservationTargetPlayers(reservation);
  const activeCount = attendance.filter(activeForGame).length;
  const hasDeclined = attendance.some((player) => player.status === "declined");
  const hasPending = attendance.some((player) => player.status === "pending");
  const reservationState = activeCount >= targetPlayers && !hasPending ? "ready" : hasDeclined ? "danger" : "warning";
  const reservationLabel = reservationState === "ready" ? `Plna sestava ${targetPlayers}/${targetPlayers}` : reservationState === "danger" ? `Chybi ${Math.max(0, targetPlayers - activeCount)} hrac` : `Ceka potvrzeni ${activeCount}/${targetPlayers}`;
  return `
    <article class="reservation-card reservation-${reservationState} ${reservation.court.surfaceClass}">
      <div>
        <strong>${reservationDateLabel(reservation)} · ${reservation.start}-${reservation.end}</strong>
        <small>${reservation.kind} · ${reservationGameLabel(reservation)} · ${reservation.court.name} · ${reservation.court.surface} · ${hours} h hry</small>
      </div>
      <span class="reservation-state">${reservationLabel}</span>
      <div class="team-strip compact-team">
        ${attendance.map((player) => `<button class="avatar tiny-avatar status-${player.status}" title="${player.name}: ${player.role}" data-action="player-detail" data-player="${player.playerId || "radim"}">${player.initials}</button>`).join("")}
      </div>
      ${attendance.some((player) => player.status === "replacement") ? `<small class="reservation-photo-note">Nahradnik je zeleny navic pouze jako nahrada za cerveneho hrace, ne jako paty aktivni hrac.</small>` : ""}
      <p class="motivation">${reservation.kind === "Trvala" ? motivation.afterLoss : motivation.afterWin}</p>
      <small class="reservation-photo-note">Fotky: pred zapasem plan hry, po zapase fotky a skore.</small>
      <button class="link-button" data-action="${reservation.kind === "Trvala" ? "cancel" : "pay"}" data-reservation="${Math.max(0, personalReservations.indexOf(reservation))}">${reservation.kind === "Trvala" ? "Omluvit se" : "Platba"}</button>
    </article>
  `;
}

function eventCalendarCard(event) {
  return `
    <article class="reservation-card event-calendar-card">
      <div>
        <strong>${event.date} · ${event.title}</strong>
        <small>Akce v kalendari · ${event.meta}</small>
      </div>
      <button class="link-button" data-action="event-detail" data-event="${event.id}">Detail</button>
    </article>
  `;
}

function calendarDay(day, joined) {
  if (!day) return `<span class="calendar-day is-empty" aria-hidden="true"></span>`;
  const isoDate = dateToIso(new Date(state.calendarYear, state.calendarMonth, Number(day), 12));
  const hasReservation = visibleReservations().some((reservation) => reservationIsoDate(reservation) === isoDate);
  const hasEvent = joined.some((event) => event.isoDate === isoDate);
  const className = [hasReservation ? "has-reservation" : "", hasEvent ? "has-event" : ""].filter(Boolean).join(" ");
  return `<button class="calendar-day ${className}" data-calendar-date="${isoDate}">${day}</button>`;
}

function courtDayOverview() {
  return `
    <section class="section">
      <div class="section-head" data-help-target="guest-courts-heading">
        <div>
          <h2 class="title-with-icon"><span class="ui-icon court-icon"></span>Cely den podle kurtu</h2>
          <p class="muted">${club.open}-${club.close}, pulhodinove bloky</p>
        </div>
        <button class="link-button" data-view-link="booking">Detail</button>
      </div>
      <div class="compact-schedule">
        ${courts.map((court) => courtScheduleRow(court, "compact")).join("")}
      </div>
      ${legend()}
    </section>
  `;
}

function courtScheduleRow(court, mode = "full") {
  return `
    <article class="court-schedule-row ${court.surfaceClass}">
      <button class="court-media" data-action="court-detail" data-court="${court.id}">
        <img src="${court.photo}" alt="${court.name}">
        <span>${court.surface}</span>
      </button>
      <div class="court-schedule-main">
        <div class="row-top">
          <h3>${court.name}</h3>
          <span class="pill">${court.surface}</span>
        </div>
        <div class="split-day-grid ${mode}">
          ${schedulePeriod(court, "morning", club.open, "12:00")}
          ${schedulePeriod(court, "afternoon", "12:00", club.close)}
        </div>
      </div>
    </article>
  `;
}

function schedulePeriod(court, period, startLabel, endLabel) {
  const periodItems = periodSlots(period);
  return `
    <div class="slot-period">
      <div class="period-label"><span>${startLabel}</span><span>${endLabel}</span></div>
      <div class="day-grid ${period}">
        ${periodItems.map((time) => scheduleSlot(court, time)).join("")}
      </div>
    </div>
  `;
}

function scheduleSlot(court, time) {
  const type = slotType(court, time);
  const reservation = slotReservation(court, time);
  const action = type === "group" ? "join-slot" : type === "free" ? "book" : type === "mine" ? "cancel" : "busy";
  const searchIcon = type === "group" ? "<span class=\"slot-search\">L</span>" : type === "pending" ? "<span class=\"slot-search\">?</span>" : "";
  const label = type === "free" ? time : reservation?.title || time;
  return `
    <button class="day-slot ${type}" title="${court.name} ${time} ${label}" data-action="${action}" data-court="${court.name}" data-time="${time}">
      ${searchIcon}
    </button>
  `;
}

function legend() {
  return `
    <div class="legend" aria-hidden="true">
      <span>Volno</span><span>Obsazeno</span><span>Moje</span><span>Hledaji hrace</span><span>Ceka na potvrzeni</span>
    </div>
  `;
}

function playerGenderClass(player) {
  const normalized = normalizeAttendancePlayer(player);
  return normalized.gender === "female" ? "gender-female" : "gender-male";
}

function reservationMotivation(reservation, index) {
  return motivationLines[(reservation.start.length + reservation.kind.length + index) % motivationLines.length];
}

function ownsReservation(reservation) {
  if (platformContext.enabled) return reservation?.canEditParticipants === true;
  if (reservation?.ownerId) return reservation.ownerId === currentPersonaId();
  return normalizedAttendance(reservation)[0]?.playerId === currentPersonaId();
}

function reservationCanBeCancelled(reservation) {
  if (!ownsReservation(reservation)) return false;
  if (reservation?.canCancelUntil) return reservation.canCancel === true && Date.now() <= new Date(reservation.canCancelUntil).getTime();
  if (!reservation?.createdAt || Number(club.cancellationMinutes) <= 0) return false;
  return Date.now() <= new Date(reservation.createdAt).getTime() + Number(club.cancellationMinutes) * 60000;
}

function reservationCancellationLabel(reservation) {
  if (!reservation?.canCancelUntil && !reservation?.createdAt) return "";
  const deadline = new Date(reservation.canCancelUntil || new Date(reservation.createdAt).getTime() + Number(club.cancellationMinutes) * 60000);
  return Number.isNaN(deadline.getTime()) ? "" : `Rezervaci lze zrusit do ${deadline.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}.`;
}

async function updateReservationParticipants(reservationIndex) {
  const reservation = personalReservations[reservationIndex];
  if (!reservation || !ownsReservation(reservation)) {
    lastActionMessage = "Sestavu muze menit jen vlastnik rezervace.";
    return false;
  }
  const selected = [...document.querySelectorAll('input[name="reservationParticipant"]:checked')].map((input) => input.value);
  const limit = reservationTargetPlayers(reservation) - 1;
  if (selected.length > limit) {
    lastActionMessage = `${reservationGameLabel(reservation)} dovoluje vybrat nejvyse ${limit} spoluhrace.`;
    return false;
  }
  const participantMode = document.querySelector("#reservationParticipantMode")?.value === "confirmed" ? "confirmed" : "pending";
  if (platformContext.enabled) {
    const participantMembershipIds = selected.map((id) => platformContext.membersByPersona.get(id)).filter(Boolean);
    if (participantMembershipIds.length !== selected.length) {
      lastActionMessage = "Nektery vybrany hrac uz neni aktivnim clenem klubu.";
      return false;
    }
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/reservations/${reservation.id}/participants`, {
        method: "PATCH",
        body: JSON.stringify({ participantMembershipIds, participantMode })
      });
      await refreshPlatformReservations();
    } catch (error) {
      lastActionMessage = error.code === "booking_conflict" ? "Nektery hrac uz v tomto case hraje." : error.message;
      return false;
    }
  } else {
    const owner = normalizedAttendance(reservation)[0];
    reservation.attendance = [owner, ...selected.map((id) => attendanceFromPlayerId(id, participantMode, participantMode === "confirmed" ? "ucast potvrzena" : "ceka na potvrzeni"))];
    reservation.players = reservation.attendance.map((player) => player.name);
    persistData();
  }
  lastActionMessage = "Sestava rezervace je upravena a zmeny dostali dotceni hraci.";
  return true;
}

async function cancelOwnedReservation(reservationIndex) {
  const reservation = personalReservations[reservationIndex];
  if (!reservation || !reservationCanBeCancelled(reservation)) {
    lastActionMessage = "Cas pro uplne zruseni rezervace uz vyprsel.";
    return false;
  }
  if (platformContext.enabled) {
    try {
      await platformRequest(`/api/v2/clubs/${platformContext.clubId}/reservations/${reservation.id}`, { method: "DELETE" });
      await refreshPlatformReservations();
    } catch (error) {
      lastActionMessage = error.code === "cancellation_window_expired" ? "Cas pro uplne zruseni rezervace uz vyprsel." : error.message;
      return false;
    }
  } else {
    courts.forEach((court) => { court.reservations = court.reservations.filter((item) => item.reservationId !== reservation.id); });
    personalReservations.splice(reservationIndex, 1);
    adminReservations.splice(0, adminReservations.length, ...adminReservations.filter((item) => item.reservationId !== reservation.id));
    notifications.splice(0, notifications.length, ...notifications.filter((item) => item.reservationId !== reservation.id));
    persistData();
  }
  lastActionMessage = "Rezervace byla zrusena a kurt je znovu volny.";
  return true;
}

function reservationCard(reservation) {
  const index = Math.max(0, personalReservations.indexOf(reservation));
  const minutes = timeToMinutes(reservation.end) - timeToMinutes(reservation.start);
  const hours = minutes / 60;
  const attendance = normalizedAttendance(reservation);
  const targetPlayers = reservationTargetPlayers(reservation);
  const gamePlayers = attendance.filter((player) => player.status !== "declined");
  const activeCount = attendance.filter(activeForGame).length;
  const hasDeclined = attendance.some((player) => player.status === "declined");
  const myDeclineCanBeUndone = canUndoReservationDecline(reservation);
  const hasPending = gamePlayers.some((player) => player.status === "pending");
  const reservationState = activeCount >= targetPlayers && !hasPending ? "ready" : activeCount < targetPlayers || hasDeclined ? "danger" : "warning";
  const reservationLabel = myDeclineCanBeUndone ? "Jsi omluveny - lze vzit zpet" : reservationState === "ready" ? `Plna sestava ${targetPlayers}/${targetPlayers}` : reservationState === "danger" ? `Chybi ${Math.max(0, targetPlayers - activeCount)} hrac` : `Ceka potvrzeni ${activeCount}/${targetPlayers}`;
  const missingText = myDeclineCanBeUndone ? "Dokud neni potvrzeny nahradnik, muzes omluvenku zrusit. Tim se uklidi i nahradnici a hlasovani." : hasDeclined ? "System nejdriv zkousi zname z historie, potom vhodne hrace podle urovne." : "";
  const orders = reservationOrders(reservation);
  return `
    <article class="reservation-card ${index === 0 ? "reservation-next" : "reservation-compact"} reservation-${reservationState} ${reservation.court.surfaceClass}" data-action="reservation-detail" data-reservation="${index}">
      <div class="reservation-main reservation-block">
        <span class="reservation-icon">${reservation.court.surface === "Antuka" ? "A" : reservation.court.surface === "Trava" ? "T" : "U"}</span>
        <span>
          <strong>${reservationDateLabel(reservation)} · ${reservation.start}-${reservation.end}</strong>
          <small>${reservation.kind} · ${reservationGameLabel(reservation)} · ${reservation.court.name} · ${reservation.court.surface} · ${hours} h hry</small>
        </span>
      </div>
      <span class="reservation-state">${reservationLabel}</span>
      <div class="reservation-block reservation-team-block">
        <small>Kdo jde</small>
        <div class="team-strip compact-team">
          ${attendance.map((player) => `<button class="avatar tiny-avatar status-${player.status} ${playerGenderClass(player)}" title="${player.name}: ${player.role}" data-action="player-detail" data-player="${player.playerId || "radim"}">${player.initials}</button>`).join("")}
        </div>
      </div>
      ${missingText ? `<div class="reservation-block reservation-note"><small>Nahradnik</small><span>${missingText}</span></div>` : ""}
      ${attendance.some((player) => player.status === "replacement") ? `<div class="reservation-block reservation-note"><small>Sestava</small><span>Nahradnik je zeleny jako nahrada za cerveneho hrace. Do hry se pocitaji aktivni, potvrzeni a vybrany nahradnik.</span></div>` : ""}
      <div class="reservation-block reservation-cheer"><small>Hlaska</small><p class="motivation">${reservationMotivation(reservation, index)}</p></div>
      <div class="reservation-block reservation-photos">
        <small>Fotky a zapis</small>
        ${reservation.photos?.length ? `<div class="uploaded-photo-strip">${reservation.photos.map((photo) => `<img src="${photo}" alt="Fotka ze zapasu">`).join("")}</div>` : `<span>Pred zapasem plan hry, po zapase skore a fotky.</span>`}
        <button class="link-button" data-action="photo" data-reservation-id="${reservation.id}">Pridat fotku</button>
      </div>
      ${orders.length ? `<div class="reservation-block reservation-orders"><small>Nachystat k rezervaci</small>${orders.map((order) => `<span>${order.product} · ${order.status}</span>`).join("")}</div>` : ""}
      <div class="reservation-actions">
        <button class="secondary-button" data-action="reservation-detail" data-reservation="${index}">Detail</button>
        ${ownsReservation(reservation) ? `<button class="secondary-button" data-action="reservation-edit" data-reservation="${index}">Upravit sestavu</button>` : ""}
        ${reservationCanBeCancelled(reservation) ? `<button class="danger-button" data-action="reservation-cancel" data-reservation="${index}">Zrusit rezervaci</button>` : ""}
        <button class="${myDeclineCanBeUndone ? "secondary-button" : "primary-button"}" data-action="cancel" data-reservation="${index}">${myDeclineCanBeUndone ? "Vzít omluvenku zpět" : "Omluvit se"}</button>
      </div>
    </article>
  `;
}

function renderBooking() {
  const selectedDate = selectedBookingDateObject();
  const selectedDateText = formatPortalDate(selectedDate, false);
  return `
    <section class="view booking-view">
      <section class="section" data-help-target="booking-date">
        <div class="section-head">
          <div>
            <h2>Rezervace kurtu</h2>
            <p class="muted">Vyber den v tydnu, mesic nebo primo volny slot u kurtu.</p>
          </div>
          <span class="pill">${selectedDateText}</span>
        </div>
        ${weekChooser()}
      </section>

      ${monthCalendar("Rezervacni kalendar")}

      <section class="section schedule-section">
        <div class="section-head compact-head" data-help-target="booking-courts">
          <h2>Kurty pro ${selectedDateText}</h2>
          <span class="pill">30 min</span>
        </div>
        <div class="booking-court-list">
          ${courts.map((court) => bookingCourtCard(court)).join("")}
        </div>
        ${legend()}
      </section>

      ${myReservationSummary(false)}
    </section>
  `;
}

function weekChooser() {
  return `
    <div class="week-grid">
      ${days.map((day, index) => {
        const date = dateForWeekIndex(index);
        const selected = !state.selectedBookingDate && state.selectedDay === index;
        return `<button class="week-day ${selected ? "active" : ""}" data-day="${index}"><strong>${day}</strong><small>${index === 0 ? "dnes" : `${date.getDate()}.${date.getMonth() + 1}.`}</small></button>`;
      }).join("")}
    </div>
  `;
}

function bookingCourtCard(court) {
  return `
    <article class="booking-court-card ${court.surfaceClass}">
      <button class="booking-court-head" data-action="court-detail" data-court="${court.id}">
        <img src="${court.photo}" alt="${court.name}">
        <span>
          <strong>${court.name}</strong>
          <small>${court.surface} · ${club.open}-${club.close}</small>
        </span>
        <b>Detail</b>
      </button>
      <div class="large-slot-groups">
        ${bookingSlotGroup(court, "Rano", periodSlots("morning"))}
        ${bookingSlotGroup(court, "Odpoledne", periodSlots("afternoon"))}
      </div>
    </article>
  `;
}

function bookingSlotGroup(court, label, items) {
  const rows = [];
  for (let index = 0; index < items.length; index += 8) {
    rows.push(items.slice(index, index + 8));
  }
  return `
    <div class="large-slot-group">
      <div class="period-label"><span>${label}</span><span>${items[0]}-${minutesToTime(timeToMinutes(items.at(-1)) + 30)}</span></div>
      <div class="large-slot-timeline">
        ${rows.map((row) => `
          <div class="hour-row">
            <span class="hour-label">${row[0]}</span>
            <div class="hour-slots">${row.map((time) => largeScheduleSlot(court, time)).join("")}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function largeScheduleSlot(court, time) {
  const type = slotType(court, time);
  const reservation = slotReservation(court, time);
  const action = type === "group" ? "join-slot" : type === "free" ? "book" : type === "mine" ? "cancel" : "busy";
  const title = type === "free" ? "Volno" : type === "mine" ? "Moje" : type === "group" ? "Hledaji" : type === "pending" ? "Ceka ?" : type === "special" ? (reservation?.title || "Akce") : "Obs.";
  if (state.role === "admin" && type === "free") {
    return `
      <button class="large-slot admin-free ${type}" data-action="special-occupancy" data-court="${court.id}" data-time="${time}">
        <strong>${time}</strong>
        <small>Volno</small>
        <span class="admin-slot-action">+ special</span>
      </button>
    `;
  }
  return `
    <button class="large-slot ${type}" data-action="${action}" data-court="${court.name}" data-time="${time}">
      <strong>${time}</strong>
      <small>${title}</small>
      ${type === "group" ? "<span class=\"slot-search\">L</span>" : type === "pending" ? "<span class=\"slot-search\">?</span>" : ""}
    </button>
  `;
}

function renderPlayers() {
  const friends = friendsForPlayer();
  const clubPlayers = players.filter((player) => player.id !== currentPersonaId() && !areFriends(currentPersonaId(), player.id));
  const seekingPlayers = players.filter((player) => {
    const need = (player.reservationNeed || "").toLowerCase();
    return need.includes("hleda") || need.includes("chybi");
  });
  return `
    <section class="view">
      <section class="section soft">
        <h2>Najit spoluhrace</h2>
        <p class="muted">Poptavka umi hledat hrace podle terminu, urovne, povrchu a stale sestavy.</p>
        <button class="primary-button" data-action="find-player">Vytvorit poptavku</button>
      </section>
      <section class="section seeking-section">
        <div class="section-head" data-help-target="player-searches">
          <div>
            <h2 class="title-with-icon"><span class="ui-icon players-seeking-icon"></span>Hledaji hrace</h2>
            <p class="muted">Aktivni poptavky na single, double a doplneni sestavy.</p>
          </div>
          <span class="pill">${seekingPlayers.length}</span>
        </div>
        ${seekingPlayers.length ? playerList(seekingPlayers, "seeking-list") : `<div class="history-card compact-empty"><strong>Nikdo ted nehleda</strong><small>Jakmile nekdo vytvori poptavku, objevi se tady.</small></div>`}
      </section>
      <section class="section">
        <div class="section-head" data-help-target="player-friends">
          <h2>Moji kamaradi</h2>
          <span class="pill handshake">Podane ruce</span>
        </div>
        ${friends.length ? playerList(friends, "friend-list") : `<div class="history-card compact-empty"><strong>Zatim zadni kamaradi</strong><small>Klikni na hrace klubu a posli zadost. Po potvrzeni se objevi tady.</small></div>`}
      </section>
      <section class="section">
        <details class="club-players">
          <summary data-help-target="player-directory">
            <span>Hraci klubu</span>
            <b>${clubPlayers.length} hraci</b>
          </summary>
          ${playerList(clubPlayers, "club-list")}
        </details>
      </section>
    </section>
  `;
}

function playerList(items, className = "") {
  return `
    <div class="player-list ${className}">
      ${items.map((player) => {
        const friend = areFriends(currentPersonaId(), player.id);
        return `
        <button class="player-row row-button ${["Handa", "Viki"].some((name) => player.name.includes(name)) ? "player-female" : "player-male"}" data-action="player-detail" data-player="${player.id}">
          <span class="avatar ${friend ? "friend-avatar" : ""}" data-player="${player.id}">${avatarContent(player)}${friend ? "<i>🤝</i>" : ""}</span>
          <span>
            <strong>${player.name}</strong>
            <small>${player.level} · ${player.type} · ${player.time}</small>
            <small>${player.reservationNeed}</small>
          </span>
          <b>${friend ? "Kamarad" : "Detail"}</b>
        </button>
      `;}).join("")}
    </div>
  `;
}

function renderEvents() {
  return `
    <section class="view">
      ${playerPollSection()}
      <section class="section">
        <div class="section-head" data-help-target="player-events">
          <div>
            <h2>Akce klubu</h2>
            <p class="muted">Detail, prihlaseni, pozvani pratel a historie turnaju.</p>
          </div>
          ${state.role === "admin" ? `<button class="small-button" data-action="event-admin">Pridat</button>` : ""}
        </div>
        ${eventList(publicEvents())}
      </section>
      ${playerTournamentSection()}
      <section class="section">
        <div class="section-head">
          <div>
            <h2>Historie akci a turnaju</h2>
            <p class="muted">Probehle akce uz neprekazeji na Domu. Tady zustavaji vysledky, fotky a odkazy na zaznamy.</p>
          </div>
          <span class="pill">${archivedEvents().length} v archivu</span>
        </div>
        ${archivedEvents().length ? eventList(archivedEvents()) : ""}
        <div class="history-list">
          <article class="history-card">
            <strong>Jarni ctyrhra 2026</strong>
            <small>Vitezove: Robin / Bob · Finale 7:5, 6:4</small>
            <p>Fotky: 18 · YouTube: zaznam finale</p>
          </article>
          <article class="history-card">
            <strong>Zimni liga 2025</strong>
            <small>Vitez: Viki · 24 odehranych zapasu</small>
            <p>Fotky: 9 · YouTube: highlights</p>
          </article>
        </div>
      </section>
    </section>
  `;
}

function playerPollSection() {
  const activePolls = clubPolls.filter((poll) => poll.status === "active");
  return `
    <section class="section poll-section">
      <div class="section-head">
        <div>
          <h2 class="title-with-icon"><span class="ui-icon event-icon"></span>Ankety klubu</h2>
          <p class="muted">Rychly dotaznik, co ma klub domluvit k testovani na kurtech.</p>
        </div>
        <span class="pill">${activePolls.length}</span>
      </div>
      <div class="product-poll-list">
        ${activePolls.length ? activePolls.map((poll) => {
          const voted = pollHasVoted(poll);
          const winner = pollWinner(poll);
          return `
            <button class="product-poll-card poll-card ${voted ? "is-voted" : ""}" data-action="product-poll" data-poll="${poll.id}">
              <span>
                <strong>${poll.title}</strong>
                <small>${poll.question}</small>
                <small>Bezi do ${poll.end} · ${pollTotalVotes(poll)} hlasu · vede ${winner?.label || "zatim nic"}</small>
              </span>
              <b>${voted ? "hlasovano" : "hlasovat"}</b>
            </button>
          `;
        }).join("") : `<article class="history-card"><strong>Zadna aktivni anketa</strong><small>Spravce ji spusti pred dalsi testovaci akci.</small></article>`}
      </div>
    </section>
  `;
}

function playerTournamentSection() {
  return `
    <section class="section">
      <div class="section-head" data-help-target="player-tournaments">
        <div>
          <h2 class="title-with-icon"><span class="ui-icon event-icon"></span>Turnaje</h2>
          <p class="muted">Single turnaje: prihlaseni do uzaverky, skupiny, pavouk a archiv vysledku.</p>
        </div>
        <span class="pill">${tournaments.length}</span>
      </div>
      <div class="admin-event-list">
        ${tournaments.map((tournament) => `
          <button class="admin-event-card" data-action="tournament-detail" data-tournament="${tournament.id}">
            <span>
              <strong>${tournament.title}</strong>
              <small>${tournament.date} · uzaverka ${tournament.deadline}</small>
              <small>${tournament.participants.length}/${tournament.maxPlayers} hracu · ${tournament.status}</small>
            </span>
            <b>Detail</b>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function eventList(items) {
  return `
    <div class="event-list">
      ${items.map((event) => {
        const thumb = eventThumbnail(event.thumbnail || (event.id.includes("doubles") ? "doubles" : event.id.includes("shoes") ? "shoes" : event.id.includes("shop") ? "shop" : "rackets"));
        return `
        <button class="event-row row-button event-card-visual event-${event.id}" data-action="event-detail" data-event="${event.id}">
          <span class="event-thumb"><img src="${thumb.image}" alt="${thumb.label}"></span>
          <span class="event-date">${event.date}</span>
          <span>
            <strong>${event.title}</strong>
            <small>${event.meta}</small>
          </span>
        </button>
      `;
      }).join("")}
    </div>
  `;
}

function legacyRenderProfile() {
  const charge = courtCharge(240, 1.5, currentUser);
  const loyalty = loyaltyProgress(currentUser);
  const nextMissingHours = Math.max(0, loyalty.next.hours - currentUser.playedHours);
  const nextBonusGain = Math.max(0, loyalty.next.bonus - (currentUser.loyaltyDiscount || 0));
  return `
    <section class="view">
      <section class="section soft">
        <div class="profile-hero">
          <button class="avatar profile-avatar" data-action="photo">${currentUser.initials}</button>
          <div>
            <h2>${currentUser.name}</h2>
            <p class="muted">Stredni uroven · preferuje ctyrhru</p>
          </div>
        </div>
        <div class="inline-actions">
          <button class="secondary-button" data-action="photo">Pridat fotku</button>
          <button class="primary-button" data-action="login">Telefon/e-mail</button>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <h2>Kredit a ceny</h2>
          <p class="muted">Kredit pripise spravce po prijeti penez klubem. Bonusovy kredit je evidovany zvlast.</p>
        </div>
          <span class="pill">${formatMoney(totalCredit(currentUser), currentUser.currency)}</span>
        </div>
        <div class="profile-list">
          <div class="profile-row"><span>Typ hrace</span><span>klubovy hrac</span></div>
          <div class="profile-row"><span>Moje sleva celkem</span><span>${currentUser.discount} %</span></div>
          <div class="profile-row"><span>Sleva spravce</span><span>${currentUser.baseDiscount} %</span></div>
          <div class="profile-row"><span>Bonus za odehrane hodiny</span><span>${currentUser.loyaltyDiscount} % · ${currentUser.playedHours} h</span></div>
          <div class="profile-row"><span>Zaplaceny kredit</span><span>${formatMoney(currentUser.paidCredit, currentUser.currency)}</span></div>
          <div class="profile-row"><span>Bonusovy kredit</span><span>${formatMoney(currentUser.bonusCredit, currentUser.currency)}</span></div>
          <div class="profile-row"><span>Modelove strzeni</span><span>Kurt 1, 90 min, -${formatMoney(charge.total)}</span></div>
          <div class="profile-row"><span>Final cena za hodinu</span><span>${formatMoney(charge.finalHourly)}/h po sleve</span></div>
        </div>
        <div class="loyalty-box">
          <div class="row-top">
            <strong>${loyalty.current.label}</strong>
            <span>${currentUser.playedHours}/${loyalty.next.hours} h</span>
          </div>
          <div class="utilization-bar"><i style="width:${loyalty.done}%"></i></div>
          <small>Stavajici vernostni sleva ${currentUser.loyaltyDiscount} %. Do dalsi urovne chybi ${nextMissingHours} h, odemkne se dalsich ${nextBonusGain} %.</small>
        </div>
        <div class="profile-row"><span>Dobiti kreditu</span><span>u spravce klubu</span></div>
      </section>

      <section class="section">
        <h2>Oznameni a ucast</h2>
        <div class="profile-list">
          <div class="profile-row"><span>Push zpravy v portalu</span><span class="pill">${state.notificationsEnabled ? "zapnuto" : "vypnuto"}</span></div>
          <div class="profile-row"><span>Potvrzeni den predem</span><span class="pill">${state.attendanceRequired ? "vyzadovano" : "vypnuto"}</span></div>
          <div class="profile-row"><span>Spravce muze vypnout</span><span>pro klub nebo jednotliveho hrace</span></div>
        </div>
        <div class="inline-actions">
          <button class="secondary-button" data-action="attendance">Nastavit potvrzovani</button>
          <button class="primary-button" data-action="enable-notifications">Zapnout notifikace a odznak</button>
        </div>
      </section>

      <section class="section">
        <h2>Klubovy kredit</h2>
        <div class="profile-list">
          <div class="profile-row"><span>Dobiti</span><span class="pill">rucne spravcem</span></div>
          <div class="profile-row"><span>Cena kurtu</span><span class="pill">odecte se z kreditu</span></div>
          <div class="profile-row"><span>Kredit klubu</span><span class="pill">840 Kc</span></div>
        </div>
      </section>

      <section class="section">
        <h2>Historie plateb</h2>
        <div class="profile-list">
          ${payments.map((payment) => `<div class="profile-row"><span><strong>${payment.title}</strong><small>${payment.date} · ${payment.status}</small></span><span class="pill">${payment.amount}</span></div>`).join("")}
        </div>
      </section>

      <section class="section">
        <h2>Historie rezervaci</h2>
        <div class="history-list">
          ${reservationHistory.map((item) => `
            <article class="history-card">
              <strong>${item.date} · ${item.time}</strong>
              <small>${item.court}</small>
              <p>${item.players}</p>
              <div class="row-top">
                <span class="pill">${item.result}</span>
                <span>${item.score}</span>
              </div>
              <small>${item.photos}</small>
            </article>
          `).join("")}
        </div>
      </section>
    </section>
  `;
}

function openPlayerSearchCount() {
  return players.filter((player) => (player.reservationNeed || "").toLowerCase().includes("hleda") || (player.reservationNeed || "").toLowerCase().includes("chybi")).length;
}

function renderHome() {
  return `
    <section class="view home-clean">
      ${notificationCenter()}
      ${gameProposalSection()}
      ${myReservationSummary()}
      ${multiClubAgendaSection()}
      ${courtDayOverview()}
      <section class="section">
        <div class="section-head">
          <h2 class="title-with-icon"><span class="ui-icon event-icon"></span>Akce klubu</h2>
          <button class="link-button" data-view-link="events">Vse</button>
        </div>
        ${eventList(publicEvents().slice(0, 2))}
      </section>
      ${clubShopSection()}
    </section>
  `;
}

function renderPlayerOrders() {
  const orders = visiblePlayerOrders();
  const stringing = visibleStringingOrders();
  return `
    <section class="view">
      <section class="section orders-section">
        <div class="section-head" data-help-target="player-orders">
          <div>
            <h2>Moje objednavky</h2>
            <p class="muted">Veci pripravene k rezervaci, vyzvednuti na klubu nebo klubove akci.</p>
          </div>
          <span class="pill">${orders.length}</span>
        </div>
        <div class="order-list">
          ${orders.length ? orders.map((order) => `
            <button class="order-card player-order-card" data-action="order-detail" data-order="${order.id || order.product}">
              <span>
                <strong>${order.product}</strong>
                <small>${orderDeliveryLabel(order)}</small>
                <small>Stav: ${order.status}${order.sourceLabel ? ` · ${order.sourceLabel}` : ""}</small>
              </span>
              <b>${order.value ? formatMoney(order.value) : "demo"}</b>
            </button>
          `).join("") : `<article class="order-card"><span><strong>Zatim zadna objednavka</strong><small>Objednat muzes z kluboveho obchodu v Domu.</small></span><b>0</b></article>`}
        </div>
      </section>
      <section class="section soft">
        <div class="section-head" data-help-target="player-stringing">
          <div>
            <h2>Vyplety raket</h2>
            <p class="muted">Servis se automaticky posila vypletaci. Tady vidis, kde raketa je a kdy bude pripravena.</p>
          </div>
          <span class="pill">${stringing.length}</span>
        </div>
        <div class="order-list">
          ${stringing.length ? stringing.map((order) => `
            <button class="order-card player-order-card" data-action="stringing-detail" data-stringing="${order.id}">
              <span>
                <strong>${order.racket}</strong>
                <small>${order.string} · ${order.tension}</small>
                <small>${order.message || `${order.statusLabel} · ${order.due}`}</small>
              </span>
              <b>${order.statusLabel}</b>
            </button>
          `).join("") : `<article class="order-card"><span><strong>Zatim zadny vyplet</strong><small>Objednat muzes v klubovem obchodu.</small></span><b>0</b></article>`}
        </div>
      </section>
      ${clubShopSection()}
    </section>
  `;
}

function notificationCenter() {
  const visible = visibleNotifications();
  const attendanceNotice = visible.find((item) => item.type === "attendance" && item.status !== "Tvoje ucast potvrzena");
  const collapsed = state.collapsedSections.has("notifications");
  return `
    <section class="section soft compact-panel notification-compact ${collapsed ? "is-collapsed" : ""}" data-help-target="player-notifications">
      <div class="section-head compact-section-head">
        <div>
          <h2 class="title-with-icon"><span class="ui-icon notification-icon"></span>Oznameni</h2>
          <p class="muted">${visible.length ? `${visible.length} veci k reseni` : "Vse je klidne"}</p>
        </div>
        <button class="icon-toggle" data-toggle-section="notifications" aria-label="${collapsed ? "Rozbalit" : "Sbalit"}">${collapsed ? "+" : "-"}</button>
      </div>
      <div class="notification-list collapsible-content">
        ${visible.length ? visible.map((item) => `
          <button class="notification-row row-button notification-${item.type || (item.id.includes("replacement") ? "replacement" : item.id.includes("counter") ? "invite" : "attendance")}" data-action="notification-detail" data-notification="${item.id}">
            <span>
              <strong>${item.title}</strong>
              <small>${item.meta}</small>
            </span>
            <b>${item.status}</b>
          </button>
        `).join("") : `<div class="notification-row"><span><strong>Vse potvrzeno</strong><small>Zadna nova oznameni.</small></span><b>klid</b></div>`}
      </div>
      ${attendanceNotice ? `<div class="inline-actions collapsible-content"><button class="secondary-button" data-confirm="decline-attendance" data-notification="${attendanceNotice.id}">Nemuzu</button><button class="primary-button" data-confirm="attendance" data-notification="${attendanceNotice.id}">Potvrdit ucast</button></div>` : ""}
    </section>
  `;
}

function gameProposalSection() {
  const collapsed = state.collapsedSections.has("proposals");
  const proposals = visibleGameProposals();
  return `
    <section class="section compact-panel proposal-compact ${collapsed ? "is-collapsed" : ""}" data-help-target="player-proposals">
      <div class="section-head compact-section-head">
        <div>
          <h2 class="title-with-icon"><span class="ui-icon proposal-icon"></span>Moje navrhy na hru</h2>
          <p class="muted">${proposals.length ? `${proposals.length} aktivni navrhy` : "Zadne aktivni navrhy"}</p>
        </div>
        <div class="section-tools">
          <button class="icon-toggle" data-toggle-section="proposals" aria-label="${collapsed ? "Rozbalit" : "Sbalit"}">${collapsed ? "+" : "-"}</button>
          <button class="small-button" data-action="invite">+</button>
        </div>
      </div>
      <div class="proposal-list collapsible-content">
        ${proposals.length ? proposals.map((proposal) => {
          const index = gameProposals.indexOf(proposal);
          const isOwner = proposal.ownerId === currentPersonaId();
          const confirmed = proposal.sentTo.filter((player) => player.status === "confirmed").length + 1;
          const target = (proposal.gameType || "double") === "single" ? 2 : 4;
          return `
            <article class="proposal-card proposal-status-${proposal.sentTo.some((player) => player.status === "declined") ? "declined" : confirmed >= target ? "ready" : "pending"}">
              <div>
                <strong>${proposal.title}</strong>
                <small>${proposal.court} · ${isOwner ? "muj navrh" : "pozvanka pro me"} · ${confirmed}/${target}</small>
              </div>
              <div class="proposal-players">
                ${proposal.sentTo.map((player) => `<span class="avatar tiny-avatar status-${player.status} ${playerGenderClass(player)}" title="${player.name}">${player.initials}</span>`).join("")}
              </div>
              <small>${proposal.state}</small>
              <div class="inline-actions">
                ${isOwner ? `<span class="status-pill">Ceka se na pozvane</span>` : `<button class="secondary-button" data-action="counter" data-proposal-id="${proposal.id}">Protinavrh</button><button class="primary-button" data-confirm="invite-game" data-proposal="${index}" data-proposal-id="${proposal.id}">Potvrdit</button>`}
              </div>
            </article>
          `;
        }).join("") : `<article class="history-card compact-empty"><strong>Zadne aktivni navrhy</strong><small>Domluvene hry se presunou do rezervaci.</small></article>`}
      </div>
    </section>
  `;
}

function renderProfile() {
  const charge = courtCharge(240, 1.5, currentUser);
  const loyalty = loyaltyProgress(currentUser);
  const nextMissingHours = Math.max(0, loyalty.next.hours - currentUser.playedHours);
  const nextBonusGain = Math.max(0, loyalty.next.bonus - (currentUser.loyaltyDiscount || 0));
  const myCreditHistory = playerCreditTransactions(currentPersonaId());
  return `
    <section class="view profile-redesign">
      <section class="profile-summary-card" data-help-target="player-profile-summary">
        <button class="avatar profile-avatar" data-action="photo" data-player="${currentPersonaId()}">${avatarContent(currentUser)}</button>
        <div>
          <p class="eyebrow">Profil hrace</p>
          <h2>${currentUser.name}</h2>
          <small>Stredni uroven · ctyrhra · ${club.name}</small>
        </div>
        <button class="small-button" data-action="photo">Foto</button>
      </section>

      <section class="section profile-wallet-card" data-help-target="player-wallet">
        <div class="profile-metric-row">
          <span><small>Kredit</small><b>${formatMoney(totalCredit(currentUser), currentUser.currency)}</b></span>
          <span><small>Sleva</small><b>${currentUser.discount} %</b></span>
          <span><small>Final / h</small><b>${formatMoney(charge.finalHourly)}</b></span>
        </div>
        <div class="discount-breakdown">
          <span><small>Spravce</small><b>${currentUser.baseDiscount || 0} %</b></span>
          <span><small>Vernost</small><b>${currentUser.loyaltyDiscount || 0} %</b></span>
          <span><small>Celkem</small><b>${currentUser.discount || 0} %</b></span>
          <span><small>Kredit</small><b>${formatMoney(currentUser.paidCredit || 0)} + ${formatMoney(currentUser.bonusCredit || 0)}</b></span>
        </div>
        <div class="loyalty-box compact-loyalty">
          <div class="row-top">
            <strong>${loyalty.current.label}</strong>
            <span>${currentUser.playedHours}/${loyalty.next.hours} h</span>
          </div>
          <div class="utilization-bar"><i style="width:${loyalty.done}%"></i></div>
          <small>Do dalsi urovne chybi ${nextMissingHours} h, odemkne se dalsich ${nextBonusGain} %.</small>
        </div>
        <div class="profile-row manual-credit-note"><span><strong>Dobiti kreditu</strong><small>Penize prijme klub a kredit pripise spravce podle bonusovych pravidel.</small></span><span class="pill">u spravce</span></div>
      </section>

      <section class="section profile-grid-section" data-help-target="player-profile-settings">
        <div class="profile-mini-grid">
          <button class="profile-mini-card" data-action="attendance"><b>${state.attendanceRequired ? "ON" : "OFF"}</b><span>Potvrzeni ucasti</span></button>
          <button class="profile-mini-card" data-action="login"><b>@</b><span>Telefon / e-mail</span></button>
          <button class="profile-mini-card" data-view-link="orders"><b>${visiblePlayerOrders().length}</b><span>Objednavky</span></button>
          <div class="profile-mini-card"><b>KC</b><span>Kredit pripisuje klub</span></div>
        </div>
      </section>

      ${platformContext.enabled ? `<section class="section"><div class="section-head"><h2>Soukromi a propojeni</h2><span class="pill">GDPR</span></div><div class="profile-mini-grid"><button class="profile-mini-card" data-action="privacy"><b>${platformPrivacy.policyVersion || "EU"}</b><span>Souhlasy a data</span></button><button class="profile-mini-card" data-action="connections"><b>${(platformConnections.connections || []).filter((item) => item.status === "accepted").length}</b><span>Meziklubovi pratele</span></button><button class="profile-mini-card" data-action="privacy"><b>${platformNotificationPreferences.push_enabled === 0 ? "OFF" : "ON"}</b><span>Push a pripominky</span></button></div></section>` : ""}

      <section class="section">
        <div class="section-head"><h2>Historie kreditu</h2><span class="pill">${myCreditHistory.length}</span></div>
        <div class="profile-list">
          ${myCreditHistory.length ? myCreditHistory.map((transaction) => `
            <div class="profile-row">
              <span><strong>Dobiti ${formatMoney(transaction.paid)}</strong><small>${formatPortalDate(new Date(transaction.createdAt))} · ${transaction.method} · ${transaction.createdBy}</small></span>
              <span><b>+${formatMoney(transaction.total)}</b><small>bonus ${formatMoney(transaction.bonus)}</small></span>
            </div>
          `).join("") : `<div class="profile-row"><span>Zatim zadne pohyby kreditu</span><span class="pill">0</span></div>`}
        </div>
      </section>

      <section class="section install-card">
        <div class="section-head">
          <div>
            <h2>Instalace na telefon</h2>
            <p class="muted">Aby fungovala ikonka na ploše a malé číslo zpráv, otevři HTTPS odkaz v telefonu a přidej portal na plochu.</p>
          </div>
          <span class="pill">${appBadgeCount()} zpravy</span>
        </div>
        <div class="profile-list">
          <div class="profile-row"><span>Android Chrome</span><span>menu ⋮ → Přidat na plochu / Instalovat aplikaci</span></div>
          <div class="profile-row"><span>iPhone Safari</span><span>Sdílet → Přidat na plochu</span></div>
          <div class="profile-row"><span>Po instalaci</span><span>klikni na Zapnout notifikace a odznak</span></div>
          <div class="profile-row"><span>Android limit</span><span>web umi spustit hlavne notifikacni tecku; cislo zalezi na launcheru telefonu</span></div>
        </div>
        <div class="inline-actions">
          <button class="primary-button" data-action="enable-notifications">Zapnout notifikace a odznak</button>
          <button class="secondary-button" data-action="test-app-badge">Test cisla na ikone</button>
          <button class="secondary-button" data-action="test-android-notification">Test Android notifikace</button>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Historie rezervaci</h2>
          <span class="pill">${reservationHistory.length}</span>
        </div>
        <div class="history-list compact-history">
          ${reservationHistory.map((item) => `
            <article class="history-card">
              <strong>${item.date} · ${item.time}</strong>
              <small>${item.court}</small>
              <p>${item.players}</p>
              <div class="row-top"><span class="pill">${item.result}</span><span>${item.score}</span></div>
            </article>
          `).join("")}
        </div>
      </section>
    </section>
  `;
}

function renderNavigation() {
  const limitedRole = ["guest", "stringer", "seller"].includes(state.role);
  const playerOrderCount = state.role === "player" ? visiblePlayerOrders().length : 0;
  const seekingCount = openPlayerSearchCount();
  const navItems = state.role === "admin"
    ? [
        { view: "home", label: "Domu", iconKey: "home" },
        { view: "booking", label: "Rezervace", iconKey: "booking" },
        { view: "players", label: "Hraci", iconKey: "players" },
        { view: "events", label: "Akce", iconKey: "events" },
        { view: "orders", label: "Objednavky", iconKey: "orders", badge: playerOrders.filter(orderNeedsAction).length },
        { view: "profile", label: "Profil", iconKey: "profile" }
      ]
    : limitedRole
      ? [
          { view: "home", label: state.role === "guest" ? "Host" : state.role === "stringer" ? "Vypletac" : "Obchod", iconKey: "home" },
          { view: "booking", label: "Tok", iconKey: "booking" },
          { view: "players", label: "Kontakty", iconKey: "players" },
          { view: "events", label: "Akce", iconKey: "events" },
          { view: "profile", label: "Profil", iconKey: "profile" }
        ]
      : [
          { view: "home", label: "Domu", iconKey: "home" },
          { view: "booking", label: "Rezervace", iconKey: "booking" },
          { view: "players", label: "Hraci", iconKey: "players", badge: seekingCount || 0 },
          { view: "events", label: "Akce", iconKey: "events" },
          { view: "orders", label: "Objednavky", iconKey: "orders", badge: playerOrderCount },
          { view: "profile", label: "Profil", iconKey: "profile" }
        ];
  const navEl = document.querySelector(".bottom-nav");
  if (navEl) {
    navEl.classList.toggle("admin-nav", state.role === "admin" || state.role === "player");
    navEl.innerHTML = navItems.map((item) => `
      <button class="nav-item ${item.view === state.view ? "active" : ""}" data-view="${item.view}">
        <span class="nav-icon icon-${item.iconKey}">${item.badge ? `<i class="nav-badge">${item.badge}</i>` : ""}</span>
        <span>${item.label}</span>
      </button>
    `).join("");
  }
  document.querySelectorAll(".role-option").forEach((button) => {
    const sameRole = button.dataset.role === state.role;
    const samePersona = !button.dataset.persona || button.dataset.persona === state.persona;
    button.classList.toggle("active", sameRole && samePersona);
  });
  const creditBadge = document.querySelector("#creditBadge");
  if (creditBadge) creditBadge.textContent = state.role === "guest" ? "Neprihlasen" : formatMoney(currentUser.credit, currentUser.currency);
  const headerName = document.querySelector(".topbar .muted");
  if (headerName) headerName.textContent = state.role === "guest" ? "Hostovsky rezim" : state.role === "admin" ? adminHeaderLabel() : state.role === "stringer" ? "Vypletac raket" : state.role === "seller" ? "Partner obchodu" : `Ahoj, ${currentUser.name.split(" ")[0]}`;
  const loginInitials = document.querySelector("#loginButton span");
  if (loginInitials) loginInitials.innerHTML = state.role === "guest" ? "H" : state.role === "admin" ? "S" : state.role === "stringer" ? "V" : state.role === "seller" ? "O" : avatarContent(currentUser);
  const clubHoursLabel = document.querySelector("#clubHoursLabel");
  if (clubHoursLabel) clubHoursLabel.textContent = `${club.open}-${club.close}`;
}

function clubShopSection() {
  const myProducts = new Set(visiblePlayerOrders().map((order) => order.product));
  return `
    <section class="section shop-section">
      <div class="section-head" data-help-target="player-shop">
        <div>
          <h2 class="title-with-icon"><span class="ui-icon shop-icon"></span>Klubovy obchod</h2>
          <p class="muted">Objednavky mimo akce, k rezervaci nebo k vyzvednuti na klubu.</p>
        </div>
        <span class="pill">B2B ceny</span>
      </div>
      <div class="shop-hero">
        <div>
          <strong>Vybaveni bez hledani po e-shopech</strong>
          <small>Micky, boty, tricka, rakety a vyplety pripravene podle rezervaci a akci.</small>
        </div>
      </div>
      <div class="shop-grid">
        ${clubShopItems.map((item) => {
          const ordered = myProducts.has(item.title);
          return `
            <button class="shop-card ${ordered ? "is-ordered" : ""}" data-action="product-order" data-product="${item.title}">
              <span>
                <strong>${item.title}</strong>
                <small>${item.type} · ${item.delivery}</small>
                <small>${ordered ? "Uz objednano, muzes objednat znovu." : item.note}</small>
              </span>
              <b>${ordered ? "objednano" : item.price}</b>
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderAdminOverview() {
  const stats = liveAdminStats();
  const tasks = liveAdminTasks();
  const todayLabel = formatPortalDate(appToday, false);
  return `
    <section class="view admin-view">
      <section class="section admin-hero" data-help-target="admin-overview">
        <div class="section-head">
          <div>
            <p class="eyebrow">${adminHeaderLabel()}</p>
            <h2>${club.name} dnes</h2>
            <p class="muted">Zivy prehled z aktualnich rezervaci, kurtu a objednavek pro ${todayLabel}.</p>
          </div>
          <span class="pill">live data</span>
        </div>
        <div class="admin-metrics">
          ${stats.map((item) => `
            <div class="admin-metric ${item.tone}">
              <strong>${item.value}</strong>
              <span>${item.label}</span>
            </div>
          `).join("")}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Co resit</h2>
          <button class="link-button" data-view-link="booking">Rezervace</button>
        </div>
        <div class="admin-task-list">
          ${tasks.map((task) => `
            <button class="admin-task row-button" data-action="${task.action}">
              <span>
                <strong>${task.title}</strong>
                <small>${task.meta}</small>
              </span>
              <b>Otevrit</b>
            </button>
          `).join("")}
        </div>
      </section>

      ${courtUtilizationSection()}
      ${businessStatsSection()}
      ${salesEngineSection()}
      ${lastMinuteSection()}
      ${creditBonusSection()}
      ${habitAlertsSection()}

      <section class="section">
        <div class="section-head" data-help-target="admin-courts">
          <h2>Kurty</h2>
          <button class="small-button" data-action="admin-court">Pridat</button>
        </div>
        <div class="admin-court-grid">
          ${courts.map((court) => `
            <button class="admin-court-card ${court.surfaceClass}" data-action="admin-court" data-court="${court.id}">
              <img src="${court.photo}" alt="${court.name}">
              <span>
                <strong>${court.name}</strong>
                <small>${court.surface} · ${club.open}-${club.close} · sazby ${priceRulesForCourt(court).length} useky</small>
              </span>
            </button>
          `).join("")}
        </div>
      </section>

    </section>
  `;
}

function courtUtilizationSection() {
  const utilization = liveCourtUtilization(dateToIso(appToday));
  return `
    <section class="section">
      <div class="section-head">
        <div>
          <h2>Vytizenost kurtu</h2>
          <p class="muted">Pocitano z aktualnich slotu v rezervacnim kalendari.</p>
        </div>
        <span class="pill">${formatPortalDate(appToday, false)}</span>
      </div>
      <div class="utilization-list">
        ${utilization.map((item) => `
          <article class="utilization-card ${item.tone}">
            <div class="row-top">
              <strong>${item.court} · ${item.surface}</strong>
              <span>${item.utilization} %</span>
            </div>
            <div class="utilization-bar"><i style="width:${item.utilization}%"></i></div>
            <div class="row-top">
              <small>Volno ${item.free}</small>
              <small>${formatMoney(item.revenue)} dnes</small>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function businessStatsSection() {
  const revenue = liveMonthlyRevenue();
  const courtStats = liveCourtBusinessStats();
  const monthTotal = revenue.at(-1)?.value || 0;
  const previousTotal = revenue.at(-2)?.value || 0;
  const maxTotal = courtStats.reduce((sum, court) => sum + court.max, 0);
  const currentTotal = courtStats.reduce((sum, court) => sum + court.current, 0);
  const potential = maxTotal ? Math.round((currentTotal / maxTotal) * 100) : 0;
  const barMax = Math.max(1, ...revenue.map((item) => item.value));
  return `
    <section class="section business-section">
      <div class="section-head">
        <div>
          <h2>Vykonnost kurtu</h2>
          <p class="muted">Pocitano z rezervaci v aktualnim sdilenem stavu.</p>
        </div>
        <span class="pill">${potential} % potencialu</span>
      </div>
      <div class="business-total-grid">
        <div class="business-total"><strong>${formatMoney(monthTotal)}</strong><span>tento mesic</span></div>
        <div class="business-total"><strong>${formatMoney(previousTotal)}</strong><span>minuly mesic</span></div>
        <div class="business-total"><strong>${formatMoney(maxTotal)}</strong><span>max. mozny vynos</span></div>
      </div>
      <div class="month-bars">
        ${revenue.map((item) => `<span style="height:${Math.max(8, Math.round((item.value / barMax) * 100))}%"><b>${item.month.slice(0, 3)}</b></span>`).join("")}
      </div>
      <div class="court-business-list">
        ${courtStats.map((court) => `
          <article class="court-business-card ${court.popularity === "nejmene oblibeny" ? "low" : court.popularity === "nejoblibenejsi" ? "top" : ""}">
            <div class="row-top">
              <strong>${court.court}</strong>
              <span>${court.trend}</span>
            </div>
            <div class="utilization-bar"><i style="width:${Math.round((court.current / court.max) * 100)}%"></i></div>
            <div class="mini-series">${court.series.map((value) => `<i style="height:${value}%"></i>`).join("")}</div>
            <div class="row-top">
              <small>${formatMoney(court.current)} / ${formatMoney(court.max)}</small>
              <small>${court.popularity}</small>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function salesEngineSection() {
  return `
    <section class="section sales-section">
      <div class="section-head">
        <div>
          <h2>Prodej pri klubovych akcich</h2>
          <p class="muted">Win-win model: hrac vyzkousi v klubu, klub vydela, platforma ma provizi a obchod doda veci na jednu adresu.</p>
        </div>
        <button class="small-button" data-action="sales-campaign">Nova</button>
      </div>
      <div class="sales-flow">
        <span>anketa hracu</span>
        <span>vazene hlasy</span>
        <span>demo dodavka</span>
        <span>test na klubu</span>
        <span>prodej + provize</span>
      </div>
      <div class="sales-campaign-list">
        ${salesCampaigns.map((campaign) => `
          <button class="sales-campaign-card" data-action="sales-campaign" data-campaign="${campaign.title}">
            <span>
              <strong>${campaign.title}</strong>
              <small>${campaign.date} · ${campaign.weather} · ${campaign.occupancy}</small>
              <small>${campaign.partner} · ${campaign.revenue}</small>
            </span>
            <b>${campaign.status}</b>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function adminOrdersSection() {
  const total = playerOrders.reduce((sum, order) => sum + order.value, 0);
  return `
    <section class="section orders-section">
      <div class="section-head">
        <div>
          <h2>Objednavky hracu</h2>
          <p class="muted">Spravce vidi produkty a sluzby od hracu, sklada je do klubovych baliku a napojuje na rezervace.</p>
        </div>
        <span class="pill">${formatMoney(total)}</span>
      </div>
      <div class="order-batch-note">
        <strong>Balickovani</strong>
        <small>Spotrebni zbozi spojovat po tydnech, vyplety sbirat pred/po rezervaci, demo boty a rakety vozit k akcim nebo plnym dnum.</small>
      </div>
      <div class="order-list">
        ${playerOrders.map((order) => `
          <button class="order-card" data-action="admin-order" data-player="${order.player}" data-product="${order.product}">
            <span>
              <strong>${order.product}</strong>
              <small>${order.player} · ${order.reservation}</small>
              <small>${order.batch}</small>
            </span>
            <b>${order.status}</b>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderAdminOrders() {
  return `
    <section class="view admin-view">
      <section class="section orders-section">
        <div class="section-head" data-help-target="admin-orders">
          <div>
            <h2>Objednavky</h2>
            <p class="muted">Vse, co musi klub nachystat: micky k rezervaci, vyplety, boty na vyzkouseni a veci k akcim.</p>
          </div>
          <span class="pill">${playerOrders.length} ceka</span>
        </div>
        <div class="order-batch-note">
          <strong>Pracovni fronta spravce</strong>
          <small>Objednavky k rezervaci pripravit na dany den, vyzvednuti na klubu nachystat podle casu, akce sloucit do demo baliku.</small>
        </div>
        <div class="order-list">
          ${playerOrders.map((order) => `
            <button class="order-card admin-order-card" data-action="admin-order" data-player="${order.player}" data-product="${order.product}">
              <span>
                <strong>${order.product}</strong>
                <small>${order.player} · ${orderDeliveryLabel(order)}</small>
                <small>Faze: ${order.status} · ${order.sourceLabel || "zdroj nerozhodnut"}</small>
                <small>${order.note || order.batch}</small>
              </span>
              <b>${order.status}</b>
            </button>
          `).join("")}
        </div>
      </section>
      <section class="section">
        <div class="section-head">
          <h2>Rozdeleni podle predani</h2>
          <span class="pill">provoz</span>
        </div>
        <div class="guardrail-grid">
          <span>K rezervaci: ${playerOrders.filter((order) => order.deliveryMode === "reservation" || !order.deliveryMode).length}</span>
          <span>Vyzvednuti: ${playerOrders.filter((order) => order.deliveryMode === "pickup").length}</span>
          <span>Akce: ${playerOrders.filter((order) => order.deliveryMode === "event").length}</span>
          <span>Servis: ${playerOrders.filter((order) => order.type === "sluzba").length}</span>
        </div>
      </section>
      <section class="section soft">
        <div class="section-head" data-help-target="admin-stringing">
          <div>
            <h2>Vyplety raket</h2>
            <p class="muted">Spravce vidi stav jen pro prehled. Prace se po objednani automaticky posila vypletaci.</p>
          </div>
          <span class="pill">${stringingOrders.length}</span>
        </div>
        <div class="order-list">
          ${stringingOrders.map((order) => `
            <article class="order-card">
              <span>
                <strong>${order.player} · ${order.racket}</strong>
                <small>${order.statusLabel} · ${order.due}</small>
                <small>${order.message || order.note}</small>
              </span>
              <div class="inline-actions">
                <b>${order.handoff}</b>
                ${order.status === "waiting_dropoff" ? `<button class="secondary-button" data-confirm="stringing-at-club" data-stringing="${order.id}">Klub prevzal raketu</button>` : ""}
                ${order.status === "returned_to_club" ? `<button class="primary-button" data-confirm="stringing-ready" data-stringing="${order.id}">Nachystano na recepci</button>` : ""}
                ${order.status === "ready_for_pickup" ? `<button class="secondary-button" data-confirm="stringing-delivered" data-stringing="${order.id}">Klub predal hraci</button>` : ""}
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    </section>
  `;
}

function lastMinuteSection() {
  return `
    <section class="section soft">
      <div class="section-head">
        <div>
          <h2>Last minute vytizeni</h2>
          <p class="muted">Sleva neni verejny odpocet. Portal ji nabizi cilene, nepravidelne a jen kdyz by kurt jinak zustal prazdny.</p>
        </div>
        <span class="pill alert">volne sloty</span>
      </div>
      <div class="guardrail-grid">
        <span>bez verejneho casovace</span>
        <span>limit za mesic</span>
        <span>cilene hracum</span>
        <span>spis bonus kredit nez sleva</span>
      </div>
      <div class="last-minute-list">
        ${lastMinuteSuggestions.map((item) => `
          <button class="last-minute-card" data-action="admin-invite" data-player="${item.player}" data-court="${item.court}" data-time="${item.time}">
            <span class="avatar tiny-avatar">${item.initials}</span>
            <span>
              <strong>${item.player}</strong>
              <small>${item.court} · ${item.time}</small>
              <small>${item.reason}</small>
              <small>Nabidka: ${item.offer}</small>
            </span>
            <b>Pozvat</b>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function creditBonusSection() {
  return `
    <section class="section">
      <div class="section-head" data-help-target="admin-credit-bonus">
        <div>
          <h2>Bonus za dobiti kreditu</h2>
          <p class="muted">Kredit je penezenka. Sleva na kurt zustava v profilu hrace, bonus se eviduje oddelene.</p>
        </div>
        <button class="small-button" data-action="credit-bonus">Pridat</button>
      </div>
      <div class="package-list">
        ${creditBonusRules.map((rule) => `
          <button class="package-card" data-action="credit-bonus" data-package="${rule.id || rule.name}">
            <span>
              <strong>${rule.name}</strong>
              <small>Od ${formatMoney(rule.paid)} · ${rule.note}</small>
            </span>
            <b>+${formatMoney(rule.bonus)} bonus</b>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function habitAlertsSection() {
  return `
    <section class="section">
      <div class="section-head">
        <div>
          <h2>Upozorneni podle navyku</h2>
          <p class="muted">Portal hlida hrace, kteri casto hraji stejny den nebo cas, a nabidne jim volny slot.</p>
        </div>
        <span class="pill">chytre pozvanky</span>
      </div>
      <div class="last-minute-list">
        ${habitAlerts.map((item) => `
          <button class="last-minute-card habit-card" data-action="habit-alert" data-player="${item.player}" data-time="${item.free}">
            <span class="avatar tiny-avatar">${item.initials}</span>
            <span>
              <strong>${item.player}</strong>
              <small>Zvyk: ${item.habit}</small>
              <small>${item.message}</small>
            </span>
            <b>Upozornit</b>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderAdminReservations() {
  return `
    <section class="view admin-view">
      <section class="section">
        <div class="section-head" data-help-target="admin-reservation-create">
          <div>
            <h2>Sprava rezervaci</h2>
            <p class="muted">Rucni rezervace, storna, potvrzeni ucasti, nahradnici a hledani hracu.</p>
          </div>
          <div class="inline-actions">
            <button class="small-button" data-action="admin-reservation">Jednorazova</button>
            <button class="small-button" data-action="admin-recurring">Trvala</button>
          </div>
        </div>
        ${weekChooser()}
      </section>

      <section class="section recurring-series-section">
        <div class="section-head">
          <div>
            <h2>Trvale rezervace</h2>
            <p class="muted">Sezonni serie a pocet zbyvajicich terminu.</p>
          </div>
          <span class="pill">${reservationSeries.filter((item) => item.status === "active").length}</span>
        </div>
        <div class="admin-reservation-list">
          ${reservationSeries.length ? reservationSeries.map((series) => `
            <button class="admin-reservation ${series.status === "active" ? "good" : ""}" data-action="admin-series" data-series="${series.id}">
              <span>
                <strong>${series.title}</strong>
                <small>${series.ownerName} · ${series.courtName} · ${formatPortalDate(dateFromIso(series.startDate), false)} az ${formatPortalDate(dateFromIso(series.endDate), false)}</small>
                <small>${series.start}-${series.end} · ${series.gameType === "single" ? "single" : "double"} · ${series.occurrenceCount} terminu</small>
              </span>
              <b>${series.status === "active" ? "aktivni" : "ukoncena"}</b>
            </button>
          `).join("") : `<div class="empty-state">Zatim neni zalozena zadna trvala rezervace.</div>`}
        </div>
      </section>

      <section class="section soft">
        <div class="section-head" data-help-target="admin-special-occupancy">
          <div>
            <h2>Specialni obsazenost</h2>
            <p class="muted">Blokace kurtu primo v rezervacich: turnaj, testovani, trening nebo vypletani.</p>
          </div>
          <button class="small-button" data-action="special-occupancy">Pridat</button>
        </div>
        <div class="special-booking-grid">
          ${courts.map((court) => `
            <article class="special-court-card ${court.surfaceClass}">
              <strong>${court.name}</strong>
              <small>${court.surface}</small>
              <div class="special-mini-actions">
                ${specialOccupancyTypes.slice(0, 3).map((type) => `
                  <button data-action="special-occupancy" data-court="${court.id}" data-type="${type.type}" style="--type-color:${type.color}">${type.label}</button>
                `).join("")}
              </div>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="section">
        <div class="admin-reservation-list">
          ${adminReservations.filter((item) => {
            const reservation = item.reservationId ? reservationById(item.reservationId) : null;
            return !reservation || (reservation.status !== "cancelled" && reservationIsoDate(reservation) === selectedBookingIsoDate());
          }).map((item) => `
            <button class="admin-reservation ${item.tone}" data-action="admin-reservation" data-reservation-id="${item.reservationId || ""}">
              <span class="admin-time">${item.time}</span>
              <span>
                <strong>${item.court} · ${item.surface}</strong>
                <small>${item.owner} · ${item.players} hracu</small>
              </span>
              <b>${item.status}</b>
            </button>
          `).join("")}
        </div>
      </section>

      <section class="section schedule-section">
        <div class="section-head compact-head" data-help-target="admin-day-control">
          <h2>Kontrola dne podle kurtu</h2>
          <span class="pill">30 min</span>
        </div>
        <div class="booking-court-list">
          ${courts.map((court) => bookingCourtCard(court)).join("")}
        </div>
        ${legend()}
      </section>
    </section>
  `;
}

function renderAdminPlayersLegacy() {
  return `
    <section class="view admin-view">
      <section class="section">
        <div class="section-head">
          <div>
            <h2>Hraci a hoste</h2>
            <p class="muted">Sprava clenu, hostovskych rezervaci, kontaktu a vyjimek pro oznameni.</p>
          </div>
          <span class="pill">${players.length} hraci</span>
        </div>
        <div class="admin-player-grid">
          ${players.map((player) => `
            <button class="admin-player-card" data-action="admin-player" data-player="${player.id}">
              <span class="avatar" data-player="${player.id}">${avatarContent(player)}</span>
              <span>
                <strong>${player.name}</strong>
                <small>${player.level} · ${player.type}</small>
                <small>${player.reservationNeed}</small>
              </span>
              <b>${player.accountType === "guest" ? "host" : "klub"}</b>
            </button>
          `).join("")}
        </div>
      </section>

      <section class="section soft">
        <div class="section-head">
          <h2>Hostovsky rezim</h2>
          <span class="pill">bez registrace</span>
        </div>
        <div class="profile-list">
          <div class="profile-row"><span>Vstup hosta</span><span>telefon/e-mail + jednorazovy kod</span></div>
          <div class="profile-row"><span>Uhrada</span><span>osobne podle pravidel klubu</span></div>
          <div class="profile-row"><span>Omezeni</span><span>max. 1 aktivni rezervace bez schvaleni</span></div>
        </div>
        <button class="secondary-button" data-action="admin-player">Nastavit pravidla hostu</button>
      </section>
    </section>
  `;
}

function renderAdminPlayers() {
  const filteredPlayers = filteredAdminPlayers();
  const activeSearch = String(state.adminPlayerSearch || "").trim();
  return `
    <section class="view admin-view">
      <section class="section">
        <div class="section-head">
          <div>
            <h2>Hraci a hoste</h2>
            <p class="muted">Typ hrace, kredit, sleva, poznamky spravce, rezervace a doporuceni do her.</p>
          </div>
          <div class="inline-actions compact-actions">
            <span class="pill">${activeSearch ? `${filteredPlayers.length}/${adminPlayerDirectory.length}` : adminPlayerDirectory.length} profily</span>
            ${isPrimaryClubAdmin() ? `<button class="small-button" data-action="admin-player-new">Novy ucet</button>` : ""}
          </div>
        </div>
        <div class="admin-player-search" role="search" data-help-target="admin-player-search">
          <label for="adminPlayerSearchInput">Vyhledat hrace nebo hosta</label>
          <div class="admin-player-search-row">
            <input id="adminPlayerSearchInput" type="search" value="${escapeAttribute(activeSearch)}" placeholder="Jmeno, e-mail nebo typ uctu" autocomplete="off">
            ${activeSearch ? `<button class="admin-player-search-clear" data-confirm="admin-player-search-clear" aria-label="Zrusit vyhledavani" title="Zrusit vyhledavani">&times;</button>` : ""}
            <button class="admin-player-search-submit" data-confirm="admin-player-search" aria-label="Vyhledat hrace" title="Vyhledat hrace"><span aria-hidden="true">&#128269;</span></button>
          </div>
          ${activeSearch ? `<small>Nalezeno ${filteredPlayers.length} profilu pro „${escapeAttribute(activeSearch)}“.</small>` : `<small>Hleda ve jmenu, e-mailu a typu uctu.</small>`}
        </div>
        <div class="admin-player-grid">
          ${filteredPlayers.map((player, index) => `
            <button class="admin-player-card ${playerTone(player)}" data-action="admin-player" data-player="${player.id}" ${index === 0 ? 'data-help-target="admin-player-list"' : ""}>
              <span class="avatar" data-player="${player.id}">${avatarContent(player)}</span>
              <span>
                <strong>${player.name}</strong>
                <small>${player.accountLabel} · ${player.age ? `${player.age} let · ` : ""}${player.level}</small>
                <small>Kredit ${formatMoney(totalCredit(player))} (${formatMoney(player.paidCredit)} + bonus ${formatMoney(player.bonusCredit)})</small>
                <small>Sleva ${player.discount} % (${player.baseDiscount} % + vernost ${player.loyaltyDiscount} %) · final Kurt 1 vecer ${formatMoney(playerFinalPrice(240, player))}/h</small>
                <small>${loyaltyTierForHours(player.playedHours).label} · ${player.playedHours} h · sezona ${formatMoney(player.seasonSpend)}</small>
                ${visibleAdminNote(player) ? `<small>${visibleAdminNote(player)}</small>` : ""}
              </span>
              <b>${player.accountType === "guest" ? "pevna cena" : "sleva"}</b>
            </button>
          `).join("") || `<div class="admin-player-empty"><strong>Zadny profil nenalezen</strong><small>Zkus jinou cast jmena nebo e-mailu.</small><button class="secondary-button" data-confirm="admin-player-search-clear">Zobrazit vsechny profily</button></div>`}
        </div>
      </section>

      <section class="section soft">
        <div class="section-head">
          <h2>Hostovsky rezim</h2>
          <span class="pill">bez registrace</span>
        </div>
        <div class="profile-list">
          <div class="profile-row"><span>Vstup hosta</span><span>telefon/e-mail + jednorazovy kod</span></div>
          <div class="profile-row"><span>Uhrada</span><span>osobne podle pravidel klubu</span></div>
          <div class="profile-row"><span>Omezeni</span><span>max. 1 aktivni rezervace bez schvaleni</span></div>
        </div>
        <button class="secondary-button" data-action="admin-player">Nastavit pravidla hostu</button>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Navaznosti kreditu</h2>
          <span class="pill">rucni pripis</span>
        </div>
        <div class="credit-flow">
          <span>penize prijme klub</span>
          <span>spravce pripise kredit</span>
          <span>rezervace</span>
          <span>odehrano</span>
          <span>strzeni kreditu</span>
          <span>historie hrace</span>
        </div>
      </section>

      <section class="section soft">
        <div class="section-head">
          <h2>Vazeny hrac a produkty</h2>
          <span class="pill">partnersky katalog</span>
        </div>
        <div class="profile-list">
          <div class="profile-row"><span>Podminka</span><span>100+ odehranych hodin v klubu</span></div>
          <div class="profile-row"><span>Vyhoda</span><span>neprenosna lepsi cena na akci nebo produkt</span></div>
          <div class="profile-row"><span>Kontrola</span><span>vazano na profil hrace, ne na kupon pro kohokoliv</span></div>
        </div>
      </section>
    </section>
  `;
}

function renderAdminEvents() {
  return `
    <section class="view admin-view">
      <section class="section">
        <div class="section-head" data-help-target="admin-events">
          <div>
            <h2>Akce a turnaje</h2>
            <p class="muted">Publikace akci, startovne, prihlaseni hraci, vysledky, fotky a odkazy.</p>
          </div>
          <button class="small-button" data-action="event-admin">Pridat</button>
        </div>
        <div class="admin-event-list">
          ${events.filter((event) => event.status !== "cancelled").map((event) => `
            <button class="admin-event-card" data-action="admin-event" data-event="${event.id}">
              <span class="event-thumb"><img src="${eventThumbnail(event.thumbnail || (event.id.includes("doubles") ? "doubles" : event.id.includes("shoes") ? "shoes" : "rackets")).image}" alt="${eventThumbnail(event.thumbnail || (event.id.includes("doubles") ? "doubles" : event.id.includes("shoes") ? "shoes" : "rackets")).label}"></span>
              <span>
                <strong>${event.title}</strong>
                <small>${event.meta}</small>
                <small>Stav: ${event.status === "published" || !event.status ? "publikovano" : event.sellerStatus || event.status}</small>
                <small>${event.registered.length} prihlasenych · ${event.fee}</small>
                <small>${event.registered.length ? `Prihlaseni: ${event.registered.slice(0, 4).join(", ")}${event.registered.length > 4 ? "..." : ""}` : "Zatim bez prihlasenych"}</small>
              </span>
              <b>${event.status === "seller_confirmed" ? "Publikovat" : "Sprava"}</b>
            </button>
          `).join("")}
        </div>
      </section>

      ${adminTournamentSection()}

      <section class="section sales-section">
        <div class="section-head" data-help-target="admin-polls">
          <div>
            <h2>Anketa sortimentu</h2>
            <p class="muted">Spravce pred akci zjisti, co hraci chteji vyzkouset. Hlasy se vazi podle utraty a aktivity hrace.</p>
          </div>
          <button class="small-button" data-action="product-poll">Nova anketa</button>
        </div>
        <div class="product-poll-list">
          ${clubPolls.map((poll) => {
            const winner = pollWinner(poll);
            return `
            <button class="product-poll-card poll-card poll-${poll.status}" data-action="product-poll" data-poll="${poll.id}">
              <span>
                <strong>${poll.title}</strong>
                <small>${poll.start}-${poll.end} · ${poll.status === "active" ? "bezi" : "ukonceno"} · ${pollTotalVotes(poll)} hlasu</small>
                <small>Vede: ${winner?.label || "zatim bez hlasu"} · vaha ${winner?.weighted || 0}</small>
              </span>
              <b>${poll.status === "active" ? "Sprava" : "Akce"}</b>
            </button>
          `;}).join("")}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <h2>Specialni obsazenost kurtu</h2>
            <p class="muted">Spravce muze blokovat kurty jinak nez beznou rezervaci: turnaj, prezentace, trening nebo servis.</p>
          </div>
          <button class="small-button" data-action="special-occupancy">Pridat blok</button>
        </div>
        <div class="special-type-grid">
          ${specialOccupancyTypes.map((item) => `
            <button class="special-type-card" data-action="special-occupancy" data-type="${item.type}" style="--type-color:${item.color}">
              <span class="type-dot"></span>
              <span>
                <strong>${item.label}</strong>
                <small>${item.note}</small>
              </span>
            </button>
          `).join("")}
        </div>
      </section>

      <section class="section">
        <h2>Turnajove vysledky</h2>
        <div class="profile-list">
          <div class="profile-row"><span>Skore muze zadat</span><span>poradatel nebo AI bot</span></div>
          <div class="profile-row"><span>Archiv</span><span>viteze, tabulky, fotky, YouTube</span></div>
          <div class="profile-row"><span>Pozvani</span><span>spravce i hrac muze pozvat kamarady</span></div>
        </div>
      </section>
    </section>
  `;
}

function adminTournamentSection() {
  return `
    <section class="section tournament-section">
      <div class="section-head" data-help-target="admin-tournaments">
        <div>
          <h2>Single a double turnaje</h2>
          <p class="muted">Jednotlivci nebo pary, uzaverka, automaticke skupiny podle poctu kurtu, tabulky a pavouk.</p>
        </div>
        <button class="small-button" data-action="tournament-admin">Novy</button>
      </div>
      <div class="admin-event-list">
        ${tournaments.map((tournament) => `
          <button class="admin-event-card" data-action="tournament-admin" data-tournament="${tournament.id}">
            <span>
              <strong>${tournament.title}</strong>
              <small>${tournament.date} · uzaverka ${tournament.deadline} · ${tournament.courts.length} kurty</small>
              <small>${tournament.participants.length}/${tournament.maxPlayers} hracu · startovne ${tournament.entryFee} · stav ${tournament.status}</small>
              <small>${tournament.rules}</small>
            </span>
            <b>${tournament.status}</b>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderAdminSettings() {
  const moduleLabels = { core: "Zaklad portalu", reservations: "Rezervace", community: "Hraci a hledani", events: "Klubove akce", tournaments: "Turnaje", payments: "Klubovy kredit", shop: "Objednavky", stringing: "Vypletani", coaches: "Treneri", operations: "Provoz klubu", analytics: "Podnikatelske statistiky", ai: "AI souhrny", access: "Automaticky vstup" };
  return `
    <section class="view admin-view">
      <section class="section">
        <div class="section-head">
          <div>
            <h2>Nastaveni klubu</h2>
            <p class="muted">Zakladni konfigurace, aby portal sel nasadit na libovolny klub a hosting.</p>
          </div>
          ${isPrimaryClubAdmin() ? `<button class="small-button" data-action="admin-settings">Upravit</button>` : `<span class="pill">jen pro cteni</span>`}
        </div>
        <div class="profile-list">
          <div class="profile-row"><span>Nazev klubu</span><span>${club.name}</span></div>
          <div class="profile-row"><span>Logo klubu</span><span>${club.logoUrl ? "obrazek z URL" : club.logoText || "inicialy"}</span></div>
          <div class="profile-row"><span>Oteviraci doba</span><span>${club.open}-${club.close}</span></div>
          <div class="profile-row"><span>Slot rezervace</span><span>${club.slotMinutes} minut</span></div>
          <div class="profile-row"><span>Potvrzeni ucasti</span><span>${state.attendanceRequired ? "den predem zapnuto" : "vypnuto"}</span></div>
          <div class="profile-row"><span>Oznameni</span><span>${state.notificationsEnabled ? "portal + push" : "vypnuto"}</span></div>
        </div>
      </section>

      ${platformContext.enabled ? `<section class="section"><div class="section-head"><div><h2>Moduly klubu</h2><p class="muted">${isPrimaryClubAdmin() ? "Funkce lze zapnout po klubech; zavislosti hlida server." : "Spravce klubu vidi aktivni funkce, ale meni je pouze hlavni spravce."}</p></div><span class="pill">${isPrimaryClubAdmin() ? "hlavni sprava" : "prehled"}</span></div><div class="profile-list">${platformModules.map((module) => `<div class="profile-row"><span><strong>${moduleLabels[module.key] || module.key}</strong><small>${module.required ? "povinny zaklad" : module.dependencies.length ? `vyzaduje ${module.dependencies.join(", ")}` : "volitelny"}</small></span>${isPrimaryClubAdmin() ? `<button class="small-button ${module.enabled ? "active" : ""}" data-confirm="module-toggle" data-module="${module.key}" data-enabled="${module.enabled}" ${module.required ? "disabled" : ""}>${module.enabled ? "Zapnuto" : "Vypnuto"}</button>` : `<span class="pill ${module.enabled ? "active" : ""}">${module.enabled ? "Zapnuto" : "Vypnuto"}</span>`}</div>`).join("")}</div></section>` : ""}

      <section class="section">
        <div class="section-head">
          <h2>Cenik a klubovy kredit</h2>
          <span class="pill">rucni pripis</span>
        </div>
        <div class="profile-list">
          <div class="profile-row"><span>Vypocet ceny</span><span>sazba kurtu × delka hry - sleva hrace</span></div>
          <div class="profile-row"><span>Dobiti kreditu</span><span>penize prijme klub, spravce pripise kredit hraci</span></div>
          <div class="profile-row"><span>Strzeni kreditu</span><span>po odehrani rezervace</span></div>
          <div class="profile-row"><span>Typy hracu</span><span>klubovy, kreditovy, host</span></div>
        </div>
        <div class="inline-actions">
          <button class="primary-button" data-view-link="players">Pripsat kredit hraci</button>
          ${platformContext.enabled ? `<button class="secondary-button" data-confirm="accounting-export">Stahnout historii kreditu</button>` : ""}
        </div>
      </section>

      <section class="section soft">
        <div class="section-head">
          <h2>Budouci automaticky zamek</h2>
          <span class="pill alert">navrh</span>
        </div>
        <div class="profile-list">
          <div class="profile-row"><span>Pristup</span><span>kod jen pro zaplacenou rezervaci</span></div>
          <div class="profile-row"><span>Cas platnosti</span><span>15 min pred a 15 min po rezervaci</span></div>
          <div class="profile-row"><span>Spravce</span><span>rucni otevreni, blokace, audit vstupu</span></div>
        </div>
      </section>
    </section>
  `;
}

function adminPaymentList() {
  return `
    <div class="profile-list">
      ${adminPayments.map((payment) => `
        <button class="profile-row row-button" data-action="admin-payment">
          <span><strong>${payment.player}</strong><small>${payment.item}</small></span>
          <span><b>${payment.amount}</b><small>${payment.status}</small></span>
        </button>
      `).join("")}
    </div>
  `;
}

async function exportAccountingCsv() {
  if (!platformContext.enabled || !platformContext.clubId) {
    lastActionMessage = "Ucetni export je dostupny po pripojeni klubu k platforme.";
    return false;
  }
  try {
    const response = await fetch(`${PLATFORM_API_BASE}/api/v2/clubs/${platformContext.clubId}/charges/export.csv`, { credentials: "include" });
    if (!response.ok) throw new Error("Ucetni export se nepodarilo pripravit.");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${platformContext.clubId}-platby-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    lastActionMessage = "Ucetni CSV je pripraveno.";
    return true;
  } catch (error) {
    lastActionMessage = error.message;
    return false;
  }
}

function priceEditor(court) {
  const rules = priceRulesForCourt(court);
  const timeOptions = slots().concat(club.close);
  const priceSlotGroup = (label, period) => {
    const items = periodSlots(period);
    if (!items.length) return "";
    return `
      <div class="price-slot-group">
        <div class="period-label"><span>${label}</span><span>${items[0]}-${club.close === items[0] ? club.close : minutesToTime(timeToMinutes(items.at(-1)) + club.slotMinutes)}</span></div>
        <div class="price-slot-board">
          ${items.map((time) => {
            const price = priceForCourtAt(court, time);
            const peak = rules.some((rule) => timeToMinutes(rule.start) <= timeToMinutes(time) && timeToMinutes(rule.end) > timeToMinutes(time) && Number(rule.price) > Number(rules[0]?.price || 0));
            return `<button class="price-slot ${peak ? "peak" : ""}" data-price-slot data-time="${time}" data-price="${price}"><strong>${time}</strong><small>${formatMoney(price)}/h</small></button>`;
          }).join("")}
        </div>
      </div>`;
  };
  return `
    <div class="price-editor" data-price-court="${court.id}">
      <div class="period-label"><span>Cenove useky</span><span>spravce vybere od-do jako u rezervace</span></div>
      <div class="price-form">
        <div class="field"><label>Dny</label><select id="priceDays"><option>Po-Pa</option><option>So-Ne</option><option>Po-Ne</option><option>Dnes</option></select></div>
        <div class="field"><label>Od</label><select id="priceStart">${timeOptions.slice(0, -1).map((time) => `<option>${time}</option>`).join("")}</select></div>
        <div class="field"><label>Do</label><select id="priceEnd">${timeOptions.slice(1).map((time) => `<option ${time === "15:00" ? "selected" : ""}>${time}</option>`).join("")}</select></div>
        <div class="field"><label>Cena / h</label><input id="priceAmount" type="number" min="0" step="10" value="${rules[0]?.price || 180}"></div>
      </div>
      <button class="primary-button" data-confirm="admin-price-save" data-court="${court.id}">Ulozit cenovy usek</button>
      ${rules.map((rule) => `
        <div class="price-rule">
          <button class="price-rule-select" data-price-rule data-court="${court.id}" data-days="${rule.days}" data-start="${rule.start}" data-end="${rule.end}" data-price="${rule.price}">
            <span><strong>${rule.days}</strong><small>${rule.start}-${rule.end}</small></span>
            <b>${formatMoney(rule.price)}/h</b>
          </button>
          <button class="price-rule-remove" data-confirm="admin-price-delete" data-court="${court.id}" data-rule="${rule.id}" aria-label="Odebrat cenovy usek ${rule.start}-${rule.end}" title="Odebrat cenovy usek">&times;</button>
        </div>
      `).join("") || `<div class="price-rule"><span><strong>Zatim bez sazby</strong><small>vyberte cas a vytvorte prvni usek</small></span><b>0 Kc/h</b></div>`}
      <div class="price-slot-groups">
        ${priceSlotGroup("Dopoledne", "morning")}
        ${priceSlotGroup("Odpoledne", "afternoon")}
      </div>
    </div>
  `;
}

function openModal(kind, data = {}) {
  const modals = {
    help: helpCenterModal,
    "help-topic": helpTopicModal,
    book: bookingModal,
    cancel: cancelModal,
    "find-player": findPlayerModal,
    "player-detail": playerDetailModal,
    invite: invitePlayerModal,
    counter: counterOfferModal,
    "publish-search": publishSearchModal,
    "join-slot": joinSlotModal,
    "reservation-detail": reservationDetailModal,
    "reservation-edit": reservationEditModal,
    "reservation-cancel": reservationCancelModal,
    "event-detail": eventDetailModal,
    "tournament-detail": tournamentDetailModal,
    "court-detail": courtDetailModal,
    login: loginModal,
    pay: payModal,
    photo: photoModal,
    guest: guestModal,
    remind: remindModal,
    attendance: attendanceModal,
    "notification-detail": notificationDetailModal,
    replacement: replacementModal,
    busy: busyModal,
    "event-admin": eventAdminModal,
    "admin-court": adminCourtModal,
    "admin-reservation": adminReservationModal,
    "admin-recurring": adminRecurringModal,
    "admin-series": adminSeriesModal,
    "admin-player": adminPlayerModal,
    "admin-player-new": adminPlayerNewModal,
    "admin-event": adminEventModal,
    "tournament-admin": tournamentAdminModal,
    "seller-event": sellerEventModal,
    "admin-payment": adminPaymentModal,
    password: passwordModal,
    privacy: privacyModal,
    connections: connectionsModal,
    "admin-settings": adminSettingsModal,
    "admin-invite": adminInviteModal,
    "credit-bonus": creditBonusModal,
    "credit-topup": manualCreditModal,
    "habit-alert": habitAlertModal,
    "sales-campaign": salesCampaignModal,
    "product-poll": productPollModal,
    "special-occupancy": specialOccupancyModal,
    "product-order": productOrderModal,
    "admin-order": adminOrderModal,
    "order-detail": orderDetailModal,
    "stringing-detail": stringingDetailModal
  };
  modalContent.innerHTML = (modals[kind] || busyModal)(data);
  applyAvatarPhotos(modalContent);
  modalBackdrop.hidden = false;
}

function bookingModal(data) {
  const selectedCourt = courtFromBookingValue(data.court);
  const selectedDateLabel = formatPortalDate(selectedBookingDateObject());
  const playerOptions = players
    .filter((player) => player.id !== currentPersonaId())
    .map((player) => `<option value="${player.id}">${player.name} · ${player.level}</option>`)
    .join("");
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Rezervace</p>
        <h2 id="modalTitle">Zabookovat kurt</h2>
        <p class="muted">${selectedDateLabel}. Vyber kurt, cas a spoluhrace. Pokud spoluhrac potvrzuje, slot se docasne zablokuje tmave sede s otaznikem.</p>
      </div>
      <div class="form-grid">
        <div class="field"><label>Den a datum</label><input id="bookingDateLabelInput" value="${selectedDateLabel}" readonly></div>
        <div class="field"><label>Typ hry</label><select id="bookingGameTypeInput"><option value="single">Single - potrebuji 1 spoluhrace</option><option value="double">Double - zaklad ctyrhry</option></select></div>
        <div class="field"><label>Kurt</label><select id="bookingCourtInput">${courts.map((court) => `<option value="${court.id}" ${court.id === selectedCourt.id ? "selected" : ""}>${court.name} · ${court.surface}</option>`).join("")}</select></div>
        <div class="field"><label>Od</label><select id="bookingStartInput">${slots().map((time) => `<option ${time === data.time ? "selected" : ""}>${time}</option>`).join("")}</select></div>
        <div class="field"><label>Delka</label><select id="bookingDurationInput">${club.defaultDurations.map((duration) => `<option value="${duration}" ${duration === 90 ? "selected" : ""}>${duration / 60} h</option>`).join("")}</select></div>
        <div class="field"><label>Spoluhrac z klubu</label><select id="bookingPartnerInput"><option value="">Zatim bez spoluhrace / hledat pozdeji</option>${playerOptions}</select></div>
        <div class="field"><label>Stav spoluhrace</label><select id="bookingPartnerModeInput"><option value="invite">Poslat zpravu a cekat na potvrzeni</option><option value="confirmed">Vim, ze jde - rovnou zapsat</option></select></div>
        <div class="field"><label>Cena rezervace</label><input value="Po odehrani se odecte z kluboveho kreditu" readonly></div>
      </div>
      <button class="primary-button" data-confirm="book">Potvrdit rezervaci</button>
    </div>
  `;
}

function cancelModal(data = {}) {
  const reservation = personalReservations[Number(data.reservation || 0)] || personalReservations[0];
  const reservationIndex = Number(data.reservation || 0);
  const canUndo = canUndoReservationDecline(reservation);
  const hasReplacement = reservationHasConfirmedReplacement(reservation);
  if (canUndo) {
    return `
      <div class="modal-body">
        <div>
          <p class="eyebrow">Omluvenka</p>
          <h2 id="modalTitle">Vzít omluvenku zpět?</h2>
          <p class="muted">${reservationDateLabel(reservation)} ${reservation.start}-${reservation.end}, ${reservation.court.name}. Protoze jeste neni potvrzeny nahradnik, vratis se do sestavy a system zrusi hledani nahradnika i hlasovani.</p>
        </div>
        <button class="primary-button" data-confirm="undo-cancel" data-reservation="${reservationIndex}">Vzít omluvenku zpět</button>
      </div>
    `;
  }
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">${reservation.kind === "Trvala" ? "Trvala rezervace - jeden termin" : "Jednorazova rezervace"}</p>
        <h2 id="modalTitle">Omluvit se z terminu?</h2>
        <p class="muted">${reservationDateLabel(reservation)} ${reservation.start}-${reservation.end}, ${reservation.court.name}. ${hasReplacement ? "Nahradnik uz je potvrzeny, proto uz omluvenku nelze vzit zpet bez domluvy se spravcem/skupinou." : "Ostatnim se hned spusti hledani a hlasovani o nahradnikovi."}</p>
      </div>
      <div class="form-grid">
        <div class="field"><label>Duvod</label><select><option>Jsem nemocny</option><option>Nemame hrace do ctyrhry</option><option>Pracovni duvody</option><option>Jine</option></select></div>
      </div>
      <button class="danger-button" data-confirm="cancel" data-reservation="${reservationIndex}">Omluvit se a spustit nahradnika</button>
    </div>
  `;
}

function findPlayerModal() {
  const timeOptions = slots().filter((time) => timeToMinutes(time) < timeToMinutes(club.close));
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Spoluhraci</p>
        <h2 id="modalTitle">Najit hrace v klubu</h2>
        <p class="muted">Portal oslovi vhodne hrace podle urovne, casu, typu hry a oblibeneho povrchu.</p>
      </div>
      <div class="form-grid">
        <div class="field"><label>Typ hry</label><select id="findGameType"><option value="double">Ctyrhra - chybi 1 az 3 hraci</option><option value="single">Dvouhra - hledam 1 hrace</option></select></div>
        <div class="field"><label>Den</label><select id="findDayInput">${days.map((day, index) => `<option value="${index}" ${index === state.selectedDay ? "selected" : ""}>${day}</option>`).join("")}</select></div>
        <div class="field"><label>Od</label><select id="findTimeInput">${timeOptions.map((time) => `<option ${time === "18:00" ? "selected" : ""}>${time}</option>`).join("")}</select></div>
        <div class="field"><label>Delka</label><select id="findDurationInput"><option value="60">1 h</option><option value="90" selected>1,5 h</option><option value="120">2 h</option></select></div>
        <div class="field"><label>Uroven</label><select><option>Stredni</option><option>Rekreacni</option><option>Pokrocila</option></select></div>
      </div>
      <button class="primary-button" data-confirm="find-player">Zverejnit poptavku</button>
    </div>
  `;
}

function playerDetailModal(data) {
  const player = players.find((item) => item.id === data.player) || players[0];
  const relation = relationshipState(player.id);
  const relationText = {
    self: "To jsi ty",
    friend: "Potvrzeny kamarad",
    sent: "Zadost ceka na potvrzeni",
    received: "Hrac ceka na tvoje potvrzeni",
    none: "Zatim nejste kamaradi"
  }[relation];
  return `
    <div class="modal-body">
      <div class="profile-hero">
        <span class="avatar profile-avatar" data-player="${player.id}">${avatarContent(player)}</span>
        <div>
          <p class="eyebrow">Profil hrace</p>
          <h2 id="modalTitle">${player.name}</h2>
          <p class="muted">${player.level} · ${player.style}</p>
        </div>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Vztah</span><span>${relationText}</span></div>
        <div class="profile-row"><span>Kdy jde hrat</span><span>${player.reservationNeed}</span></div>
        <div class="profile-row"><span>Turnaje</span><span>${player.tournaments}</span></div>
        <div class="profile-row"><span>Spolu jste hrali</span><span>${player.lastPlayed}</span></div>
        <div class="profile-row"><span>Klubova bilance</span><span>${player.record}</span></div>
      </div>
      <div class="inline-actions">
        ${relation === "friend" ? `<button class="secondary-button" data-action="invite" data-player="${player.id}">Pozvat na hru</button>` : ""}
        ${relation === "none" ? `<button class="secondary-button" data-confirm="friend-request" data-player="${player.id}">Pozadat o kamaradstvi</button>` : ""}
        ${relation === "received" ? `<button class="secondary-button" data-confirm="decline-friend" data-notification="${notifications.find((item) => item.type === "friend-request" && item.requestFrom === player.id && item.recipients?.includes(currentPersonaId()))?.id || ""}">Odmitnout</button><button class="primary-button" data-confirm="accept-friend" data-notification="${notifications.find((item) => item.type === "friend-request" && item.requestFrom === player.id && item.recipients?.includes(currentPersonaId()))?.id || ""}">Potvrdit kamaradstvi</button>` : ""}
        <button class="primary-button" data-confirm="contact">Zprava</button>
      </div>
    </div>
  `;
}

function legacyInvitePlayerModal(data) {
  const player = players.find((item) => item.id === data.player) || players[0];
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Pozvanka na hru</p>
        <h2 id="modalTitle">${player.name}</h2>
        <p class="muted">Navrh posles hraci. Muze potvrdit, odmitnout nebo poslat protinavrh casu.</p>
      </div>
      <div class="form-grid">
        <div class="field"><label>Navrhovany termin</label><select><option>Patek 17:00-18:30</option><option>Patek 18:30-20:00</option><option>Sobota 9:30-11:00</option></select></div>
        <div class="field"><label>Kurt</label><select><option>Kurt 1 · Antuka</option><option>Kurt 2 · Umele</option></select></div>
      </div>
      <div class="inline-actions">
        <button class="secondary-button" data-action="publish-search">Kdyz neodpovi, zverejnit</button>
        <button class="primary-button" data-confirm="invite-game">Poslat pozvanku</button>
      </div>
    </div>
  `;
}

function counterOfferModal(data = {}) {
  const proposal = gameProposals.find((item) => item.id === data.proposalId) || visibleGameProposals()[0];
  const parsed = parseProposalTime(proposal?.title || "") || { start: "17:00", end: "18:30" };
  const date = proposal?.isoDate || selectedBookingIsoDate();
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Protinavrh</p>
        <h2 id="modalTitle">Navrhnout jiny volny termin</h2>
        <p class="muted">Vyber konkretni datum, kurt a vsechny pulhodinove casy. Puvodni rezervace zustane blokovana, dokud zvouci hrac protinavrh neprijme.</p>
      </div>
      <div class="form-grid">
        <div class="field"><label>Datum</label><input id="counterDateInput" type="date" value="${date}"></div>
        <div class="field"><label>Kurt</label><select id="counterCourtInput">${courts.map((court) => `<option value="${court.id}">${court.name} · ${court.surface}</option>`).join("")}</select></div>
        <div class="field"><label>Od</label><select id="counterStartInput">${slots().slice(0, -1).map((time) => `<option ${time === parsed.start ? "selected" : ""}>${time}</option>`).join("")}</select></div>
        <div class="field"><label>Do</label><select id="counterEndInput">${slots().slice(1).map((time) => `<option ${time === parsed.end ? "selected" : ""}>${time}</option>`).join("")}</select></div>
      </div>
      <button class="primary-button" data-confirm="counter-send" data-proposal-id="${proposal?.id || ""}">Odeslat protinavrh</button>
    </div>
  `;
}

function invitePlayerModal(data) {
  const player = players.find((item) => item.id === data.player);
  const event = events.find((item) => item.id === data.event);
  const eventMode = Boolean(event);
  const gameTimeOptions = availableGameTimeOptions();
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">${eventMode ? "Pozvanka na akci" : "Pozvanka na hru"}</p>
        <h2 id="modalTitle">${eventMode ? event.title : player ? player.name : "Vyber kamarady"}</h2>
        <p class="muted">${eventMode ? "Vyber libovolne mnozstvi kamaradu. Kazdemu prijde oznameni a po potvrzeni se akce prida do jeho prehledu." : "U singlu vyber jednoho hrace, u double muzes vybrat vice hracu. Pozvanym prijde oznameni a po potvrzeni se sestava prevede na rezervaci."}</p>
      </div>
      <div class="form-grid">
        ${eventMode ? `<input type="hidden" id="inviteEventInput" value="${event.id}">` : `
          <div class="field"><label>Typ hry</label><select id="inviteGameType"><option value="single">Single - 2 hraci</option><option value="double" selected>Double - 4 hraci</option></select></div>
          <div class="field"><label>Navrhovany termin</label><select id="inviteTimeInput">${gameTimeOptions.map((option) => `<option>${option}</option>`).join("")}</select></div>
          <div class="field"><label>Kurt</label><select id="inviteCourtInput">${courts.map((court) => `<option value="${court.id}">${court.name} · ${court.surface}</option>`).join("")}</select></div>
        `}
        <div class="field invite-friends-field"><label>Koho pozvat</label><div class="choice-list">${friendOptions(player?.id || "", { eventId: event?.id || "" })}</div></div>
      </div>
      <div class="inline-actions">
        <button class="secondary-button" data-action="publish-search">Kdyz neodpovi, zverejnit</button>
        <button class="primary-button" data-confirm="${eventMode ? "invite-event" : "invite-game"}" ${eventMode ? `data-event="${event.id}"` : ""}>Poslat pozvanku</button>
      </div>
    </div>
  `;
}

function publishSearchModal() {
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Hledani spoluhrace</p>
        <h2 id="modalTitle">Zverejnit poptavku?</h2>
        <p class="muted">Pokud pozvani hraci nepotvrdi, portal nabidne zverejneni na nastence klubu.</p>
      </div>
      <button class="primary-button" data-confirm="publish-search">Zverejnit na portalu</button>
    </div>
  `;
}

function joinSlotModal(data) {
  const join = slotJoinState(data);
  const attendance = join.reservation
    ? normalizedAttendance(join.reservation).filter((player) => player.status !== "declined").map((player) => player.name).join(", ")
    : (join.slot?.players || ["Robin", "Bob", "Radim"]).join(", ");
  const end = join.slot?.end || minutesToTime(timeToMinutes(data.time || "18:30") + 90);
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Hledaji spoluhrace</p>
        <h2 id="modalTitle">${data.court || "Kurt"} ${data.time || ""}</h2>
        <p class="muted">${join.allowed ? "Rezervace je obsazena, ale chybi hrac. Portal odhadne, jestli se hodis podle urovne a historie hry." : join.reason}</p>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Hledaji</span><span>${attendance}</span></div>
        <div class="profile-row"><span>Cas</span><span>${join.slot?.start || data.time || "18:30"}-${end}</span></div>
        <div class="profile-row"><span>Hodnoceni shody</span><span class="pill">${join.allowed ? "vhodny hrac" : "kolize"}</span></div>
        <div class="profile-row"><span>Schvaleni</span><span>${join.allowed ? "Skupina te musi potvrdit" : "Prihlaseni neni mozne"}</span></div>
      </div>
      <button class="primary-button" data-confirm="join-slot" data-court="${data.court || ""}" data-time="${data.time || ""}" ${join.allowed ? "" : "disabled"}>${join.allowed ? "Zkusit se prihlasit" : "Nelze se prihlasit"}</button>
    </div>
  `;
}

function reservationDetailModal(data) {
  const reservation = personalReservations[Number(data.reservation || 0)] || personalReservations[0];
  const reservationIndex = Math.max(0, personalReservations.indexOf(reservation));
  const attendance = normalizedAttendance(reservation);
  const orders = reservationOrders(reservation);
  return `
    <div class="modal-body reservation-detail-modal">
      <div>
        <p class="eyebrow">Detail rezervace</p>
        <h2 id="modalTitle">${reservationDateLabel(reservation)} · ${reservation.start}-${reservation.end}</h2>
        <p class="muted">${reservation.kind} · ${reservation.court.name} · ${reservation.court.surface}</p>
      </div>
      <img class="modal-court-image" src="${reservation.court.photo}" alt="${reservation.court.name}">
      <div class="player-card-grid">
        <div class="player-info-tile"><span class="tile-icon">K</span><small>Kurt</small><b>${reservation.court.name}</b><small>${reservation.court.surface}</small></div>
        <div class="player-info-tile"><span class="tile-icon">h</span><small>Delka</small><b>${(timeToMinutes(reservation.end) - timeToMinutes(reservation.start)) / 60} h</b><small>${reservation.start}-${reservation.end}</small></div>
      </div>
      <div class="profile-list profile-list-polished">
        ${attendance.map((player) => `<div class="profile-row"><span>${player.name}</span><span>${player.role}</span></div>`).join("")}
      </div>
      ${orders.length ? `
        <div class="service-card">
          <div class="row-top"><span><b>Objednavky k teto rezervaci</b><small>${orders.map((order) => `${order.product} - ${order.status}`).join(", ")}</small></span></div>
        </div>
      ` : ""}
      <div class="service-card">
        <div class="row-top"><span><b>Fotky ze zapasu</b><small>${reservation.photos?.length ? `${reservation.photos.length} nahranych fotek` : "Zatim bez fotek"}</small></span></div>
        ${reservation.photos?.length ? `<div class="uploaded-photo-grid">${reservation.photos.map((photo) => `<img src="${photo}" alt="Fotka ze zapasu">`).join("")}</div>` : ""}
        <button class="secondary-button" data-action="photo" data-reservation-id="${reservation.id}">Pridat fotku</button>
      </div>
      <div class="history-list">
        ${reservationHistory.map((item) => `
          <article class="history-card">
            <strong>${item.date} · ${item.result}</strong>
            <small>${item.players}</small>
            <p>${item.score} · ${item.photos}</p>
          </article>
        `).join("")}
      </div>
      <div class="service-card">
        <div class="row-top"><span><b>Systemove doporuceni</b><small>Pokud nekdo odrekne, nejdriv pozvat zname z historie hry, potom podobnou uroven a az pak verejne hledani.</small></span></div>
      </div>
      ${ownsReservation(reservation) ? `<div class="service-card"><div class="row-top"><span><b>Oprava rezervace</b><small>${reservationCancellationLabel(reservation) || `Sestavu muzes upravit i pozdeji. Cele zruseni povoluje klub ${club.cancellationMinutes} minut od objednani.`}</small></span></div><div class="inline-actions"><button class="secondary-button" data-action="reservation-edit" data-reservation="${reservationIndex}">Zmenit spoluhrace</button>${reservationCanBeCancelled(reservation) ? `<button class="danger-button" data-action="reservation-cancel" data-reservation="${reservationIndex}">Zrusit celou rezervaci</button>` : ""}</div></div>` : ""}
    </div>
  `;
}

function reservationEditModal(data) {
  const reservationIndex = Number(data.reservation || 0);
  const reservation = personalReservations[reservationIndex] || personalReservations[0];
  if (!reservation || !ownsReservation(reservation)) return busyModal();
  const selected = new Set(normalizedAttendance(reservation)
    .filter((player) => player.playerId !== currentPersonaId() && !["declined", "candidate"].includes(player.status))
    .map((player) => player.playerId));
  const limit = reservationTargetPlayers(reservation) - 1;
  const choices = players.filter((player) => player.id !== currentPersonaId() && (player.clubRole || "player") === "player" && (!platformContext.enabled || platformContext.membersByPersona.get(player.id)));
  return `<div class="modal-body"><div><p class="eyebrow">Oprava rezervace</p><h2 id="modalTitle">Zmenit spoluhrace</h2><p class="muted">${reservationDateLabel(reservation)} · ${reservation.start}-${reservation.end} · ${reservationGameLabel(reservation)}. Vyber nejvyse ${limit} hrace.</p></div><div class="player-choice-grid">${choices.map((player) => `<label class="profile-row"><span><span class="avatar tiny-avatar ${player.gender === "female" ? "gender-female" : "gender-male"}">${player.initials}</span> ${player.name}</span><input type="checkbox" name="reservationParticipant" value="${player.id}" ${selected.has(player.id) ? "checked" : ""}></label>`).join("")}</div><div class="field"><label>Stav vybranych hracu</label><select id="reservationParticipantMode"><option value="pending">Poslat pozvanku a cekat na potvrzeni</option><option value="confirmed">Uz jsme domluveni, rovnou potvrdit</option></select></div><button class="primary-button" data-confirm="reservation-participants-save" data-reservation="${reservationIndex}">Ulozit sestavu</button></div>`;
}

function reservationCancelModal(data) {
  const reservationIndex = Number(data.reservation || 0);
  const reservation = personalReservations[reservationIndex] || personalReservations[0];
  if (!reservation || !reservationCanBeCancelled(reservation)) return `<div class="modal-body"><h2 id="modalTitle">Rezervaci uz nelze zrusit</h2><p class="muted">Casove okno nastavene klubem uz vyprselo. Muzeš se omluvit ze sve ucasti nebo kontaktovat spravce.</p></div>`;
  return `<div class="modal-body"><div><p class="eyebrow">Zruseni rezervace</p><h2 id="modalTitle">Uvolnit cely kurt?</h2><p class="muted">${reservationDateLabel(reservation)} · ${reservation.start}-${reservation.end} · ${reservation.court.name}. Vsem spoluhracum prijde zprava a termin se okamzite uvolni.</p></div><div class="service-card"><b>${reservationCancellationLabel(reservation)}</b></div><button class="danger-button" data-confirm="reservation-cancel" data-reservation="${reservationIndex}">Ano, zrusit celou rezervaci</button></div>`;
}

function eventDetailModal(data) {
  const event = events.find((item) => item.id === data.event) || events[0];
  const joined = visibleJoinedEvents().some((item) => item.id === event.id);
  const thumb = eventThumbnail(event.thumbnail || (event.id.includes("doubles") ? "doubles" : event.id.includes("shoes") ? "shoes" : "rackets"));
  return `
    <div class="modal-body">
      <img class="modal-court-image event-hero-image" src="${thumb.image}" alt="${thumb.label}">
      <div>
        <p class="eyebrow">${event.id === "doubles" ? "Turnaj" : "Akce klubu"}</p>
        <h2 id="modalTitle">${event.title}</h2>
        <p class="muted">${event.meta}</p>
      </div>
      <p>${event.detail}</p>
      <div class="profile-list">
        <div class="profile-row"><span>Cena</span><span class="pill">${event.fee}</span></div>
        ${event.history ? `<div class="profile-row"><span>Historie</span><span>${event.history}</span></div>` : ""}
        ${event.aiNote ? `<div class="profile-row"><span>Skore</span><span>${event.aiNote}</span></div>` : ""}
      </div>
      <div class="tournament-table">
        <div class="table-head"><span>Prihlaseni</span><span>Status</span></div>
        ${event.registered.map((name, index) => `<div class="table-row"><span>${index + 1}. ${name}</span><span>${event.id === "doubles" ? "par potvrzen" : "prihlasen"}</span></div>`).join("")}
      </div>
      <div class="inline-actions">
        <button class="secondary-button" data-action="invite" data-event="${event.id}">Pozvat kamarada</button>
        <button class="primary-button" data-confirm="join" data-event="${event.id}">${joined ? "Uz jsem prihlasen" : "Zucastnim se"}</button>
      </div>
    </div>
  `;
}

function courtDetailModal(data) {
  const court = courts.find((item) => item.id === data.court) || courts[0];
  return `
    <div class="modal-body">
      <img class="modal-court-image" src="${court.photo}" alt="${court.name}">
      <div>
        <p class="eyebrow">Sprava kurtu</p>
        <h2 id="modalTitle">${court.name}</h2>
        <p class="muted">${court.surface}. Fotka, styl a barvy budou nastavitelne spravcem.</p>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Povrch</span><span class="pill">${court.surface}</span></div>
        <div class="profile-row"><span>Barva stylu</span><span class="surface-swatch" style="background:${court.color}"></span></div>
        <div class="profile-row"><span>Provoz</span><span>${club.open}-${club.close}</span></div>
      </div>
      <button class="primary-button" data-confirm="close">Upravit ve sprave kurtu</button>
    </div>
  `;
}

function loginModal() {
  const signedIn = platformContext.enabled && Boolean(platformContext.userId);
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Prihlaseni</p>
        <h2 id="modalTitle">E-mail a heslo</h2>
      </div>
      ${signedIn ? `<div class="profile-list"><div class="profile-row"><span>Prihlasen</span><span>${platformContext.email}</span></div></div>` : `<div class="form-grid">
        <div class="field"><label>E-mail</label><input id="loginEmailInput" value="" type="email" autocomplete="username"></div>
        <div class="field"><label>Heslo</label><input id="loginPasswordInput" value="" type="password" autocomplete="current-password"></div>
      </div>`}
      <div class="inline-actions">
        ${signedIn ? `<button class="secondary-button" data-action="password">Zmenit heslo</button>` : ""}
        <button class="primary-button" data-confirm="${signedIn ? "logout" : "login-enter"}">${signedIn ? "Odhlasit" : "Prihlasit"}</button>
      </div>
    </div>
  `;
}

function passwordModal() {
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Zabezpeceni uctu</p>
        <h2 id="modalTitle">Zmenit heslo</h2>
        <p class="muted">Po zmene se odhlasi tento telefon i vsechna dalsi zarizeni.</p>
      </div>
      <div class="form-grid">
        <div class="field"><label>Soucasne heslo</label><input id="currentPasswordInput" type="password" autocomplete="current-password"></div>
        <div class="field"><label>Nove heslo</label><input id="newPasswordInput" type="password" minlength="12" autocomplete="new-password"></div>
        <div class="field"><label>Nove heslo znovu</label><input id="confirmPasswordInput" type="password" minlength="12" autocomplete="new-password"></div>
      </div>
      <button class="primary-button" data-confirm="password-change">Zmenit heslo a odhlasit zarizeni</button>
    </div>
  `;
}

function payModal() {
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Klubovy kredit</p>
        <h2 id="modalTitle">Dobiti u spravce</h2>
        <p class="muted">Tennis Siruch nepouziva platebni branu. Penize prijme klub a spravce je pripise do kreditu hrace.</p>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Zustatek</span><span class="pill">${formatMoney(totalCredit(currentUser))}</span></div>
        <div class="profile-row"><span>Postup</span><span>kontaktuj spravce klubu</span></div>
      </div>
      <button class="primary-button" data-confirm="close">Zavrit</button>
    </div>
  `;
}

function photoModal(data = {}) {
  const reservation = data.reservationId ? personalReservations.find((item) => item.id === data.reservationId) : null;
  const kind = reservation ? "reservation" : "profile";
  const targetId = reservation?.id || currentPersonaId();
  const title = reservation ? "Fotka k rezervaci" : "Profilova fotka";
  const currentPhoto = reservation?.photos?.at(-1) || currentUser.photo || "";
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">${title}</p>
        <h2 id="modalTitle">Vybrat vlastni obrazek</h2>
        <p class="muted">Vyber fotku z galerie telefonu, fotoaparatu nebo souboru. Portal ji pred nahranim automaticky zmensi.</p>
      </div>
      <img id="photoUploadPreview" class="upload-preview ${currentPhoto ? "" : "is-empty"}" src="${currentPhoto || "assets/court-top-view.png"}" alt="Nahled obrazku">
      <label class="primary-button file-upload-button">
        Vybrat fotku
        <input type="file" accept="image/*" data-image-upload data-image-kind="${kind}" data-target-id="${targetId}" data-preview="photoUploadPreview">
      </label>
    </div>
  `;
}

function guestModal() {
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Host bez registrace</p>
        <h2 id="modalTitle">Rychla rezervace hosta</h2>
        <p class="muted">Host zada telefon, dostane jednorazovy kod a muze rezervovat podle pravidel klubu. Pri opakovanem hrani ho portal pozve k profilu.</p>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>1. krok</span><span>Telefon nebo e-mail</span></div>
        <div class="profile-row"><span>2. krok</span><span>SMS/e-mail kod</span></div>
        <div class="profile-row"><span>3. krok</span><span>Rezervace + uhrada na klubu</span></div>
      </div>
      <button class="primary-button" data-confirm="guest">Pokracovat jako host</button>
    </div>
  `;
}

function remindModal() {
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Upozorneni sestavy</p>
        <h2 id="modalTitle">Poslat pripominku hracum?</h2>
        <p class="muted">Zprava prijde v portalu a pozdeji jako mobilni push notifikace pres ikonu aplikace.</p>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Rezervace</span><span>Patek 17:00-18:30, Kurt 1</span></div>
        <div class="profile-row"><span>Komu</span><span>Radim, Robin, Bob, Honza</span></div>
        <div class="profile-row"><span>Text</span><span>Zitra hrajeme. Potvrdte ucast.</span></div>
      </div>
      <button class="primary-button" data-confirm="remind">Poslat upozorneni</button>
    </div>
  `;
}

function attendanceModal() {
  const notice = visibleNotifications().find((item) => item.type === "attendance");
  const noticeAttr = notice ? `data-notification="${notice.id}"` : "";
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Potvrzeni ucasti</p>
        <h2 id="modalTitle">Jdes hrat?</h2>
        <p class="muted">Spravce muze vyzadovat potvrzeni den predem. Hrac nebo spravce si tuto funkci muze vypnout.</p>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Pravidlo klubu</span><span class="pill">${state.attendanceRequired ? "zapnuto" : "vypnuto"}</span></div>
        <div class="profile-row"><span>Moje notifikace</span><span class="pill">${state.notificationsEnabled ? "zapnute" : "vypnute"}</span></div>
      </div>
      <div class="inline-actions">
        <button class="secondary-button" data-confirm="decline-attendance" ${noticeAttr}>Nemuzu prijit</button>
        <button class="primary-button" data-confirm="attendance" ${noticeAttr}>Potvrzuji ucast</button>
      </div>
    </div>
  `;
}

function replacementModal() {
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Nahradnik</p>
        <h2 id="modalTitle">System hleda nahradu</h2>
        <p class="muted">Omluvu das co nejdrive. Portal najde volne hrace a zbyvajici clenove rezervace hlasuji.</p>
      </div>
      <div class="tournament-table">
        <div class="table-head"><span>Kandidat</span><span>Hlasy</span></div>
        <div class="table-row"><span>Marek</span><span>2</span></div>
        <div class="table-row"><span>Handa</span><span>1</span></div>
        <div class="table-row"><span>Darek</span><span>0</span></div>
      </div>
      <button class="primary-button" data-confirm="replacement">Vybrat nejhlasovanejsiho</button>
    </div>
  `;
}

function notificationDetailModal(data = {}) {
  const item = notifications.find((notification) => notification.id === data.notification) || visibleNotifications().find((notification) => notification.id === data.notification);
  if (item?.type === "stringing" || item?.type === "stringing-ready") {
    const order = stringingOrders.find((entry) => entry.id === item.stringingId) || visibleStringingOrders()[0];
    return `
      <div class="modal-body">
        <div>
          <p class="eyebrow">Vyplet rakety</p>
          <h2 id="modalTitle">${item.title}</h2>
          <p class="muted">${item.meta}</p>
        </div>
        ${order ? `
          <div class="profile-list">
            <div class="profile-row"><span>Raketa</span><span>${order.racket}</span></div>
            <div class="profile-row"><span>Vyplet</span><span>${order.string} · ${order.tension}</span></div>
            <div class="profile-row"><span>Stav</span><span>${order.statusLabel}</span></div>
            <div class="profile-row"><span>Predani</span><span>${order.handoff}</span></div>
            <div class="profile-row"><span>Termin</span><span>${order.reservation}</span></div>
          </div>
        ` : ""}
        <button class="primary-button" data-confirm="close">Rozumim</button>
      </div>
    `;
  }
  if (item?.type === "poll") {
    const poll = pollById(item.pollId);
    return productPollModal({ poll: poll.id });
  }
  if (item?.type === "booking-invite") {
    const reservation = reservationById(item.reservationId) || personalReservations[0];
    return `
      <div class="modal-body">
        <div>
          <p class="eyebrow">Pozvanka k rezervaci</p>
          <h2 id="modalTitle">${reservationTimeLabel(reservation)}</h2>
          <p class="muted">${reservationGameLabel(reservation)} · ${reservation.court.name}. Po potvrzeni se rezervace rozsviti jako potvrzena, po odmitnuti se zmeni na hledani spoluhrace.</p>
        </div>
        <div class="profile-list">
          <div class="profile-row"><span>Den</span><span>${reservationDateLabel(reservation)}</span></div>
          <div class="profile-row"><span>Kurt</span><span>${reservation.court.name} · ${reservation.court.surface}</span></div>
          <div class="profile-row"><span>Cas</span><span>${reservation.start}-${reservation.end}</span></div>
          <div class="profile-row"><span>Stav</span><span>${item.status}</span></div>
        </div>
        <div class="inline-actions">
          <button class="secondary-button" data-confirm="decline-booking-invite" data-notification="${item.id}">Odmitnout</button>
          <button class="primary-button" data-confirm="accept-booking-invite" data-notification="${item.id}">Potvrdit ucast</button>
        </div>
      </div>
    `;
  }
  if (item?.type === "attendance") {
    const reservation = personalReservations[item.reservationIndex || 0] || personalReservations[0];
    return `
      <div class="modal-body">
        <div>
          <p class="eyebrow">Potvrzeni ucasti</p>
          <h2 id="modalTitle">${reservationDateLabel(reservation)} ${reservation.start}-${reservation.end}</h2>
          <p class="muted">${reservation.court.name}, ${reservation.court.surface}. Kdyz nemuzes, oznameni zmizi a system hned spusti hledani nahradnika.</p>
        </div>
        <div class="profile-list">
          <div class="profile-row"><span>Typ hry</span><span>${reservationGameLabel(reservation)}</span></div>
          <div class="profile-row"><span>Stav</span><span>${item.status}</span></div>
        </div>
        <div class="inline-actions">
          <button class="secondary-button" data-confirm="decline-attendance" data-notification="${item.id}">Nemuzu prijit</button>
          <button class="primary-button" data-confirm="attendance" data-notification="${item.id}">Potvrzuji ucast</button>
        </div>
      </div>
    `;
  }
  if (item?.type === "replacement-invite") {
    return `
      <div class="modal-body">
        <div><p class="eyebrow">Pozvanka jako nahradnik</p><h2 id="modalTitle">${item.title}</h2>
          <p class="muted">${item.meta}. Po tvem souhlasu rozhodnou aktivni hraci hlasovanim; teprve vybrany nahradnik se zapise do rezervace.</p></div>
        <div class="inline-actions">
          <button class="secondary-button" data-confirm="decline-replacement-invite" data-notification="${item.id}">Odmitnout</button>
          <button class="primary-button" data-confirm="accept-replacement-invite" data-notification="${item.id}">Mam cas</button>
        </div>
      </div>`;
  }
  if (item?.type === "replacement-vote") {
    const candidate = playerRecordById(platformPersonaByMembership(item.candidateMembershipId));
    return `
      <div class="modal-body">
        <div><p class="eyebrow">Hlasovani sestavy</p><h2 id="modalTitle">${candidate?.name || "Kandidat na nahradnika"}</h2>
          <p class="muted">${item.meta}</p></div>
        <div class="profile-list"><div class="profile-row"><span>Kandidat</span><span>${candidate?.name || "Clen klubu"}</span></div></div>
        <button class="primary-button" data-confirm="platform-replacement-vote" data-notification="${item.id}">Hlasovat pro hrace</button>
      </div>`;
  }
  if (item?.type === "counterproposal") {
    return `
      <div class="modal-body">
        <div><p class="eyebrow">Protinavrh hry</p><h2 id="modalTitle">${item.title}</h2>
          <p class="muted">Novy termin: ${item.meta}. Pri prijeti portal znovu zkontroluje kurt i vsechny hrace a presune jejich pulhodinove bloky.</p></div>
        <div class="inline-actions">
          <button class="secondary-button" data-confirm="counter-decline" data-notification="${item.id}">Odmitnout</button>
          <button class="primary-button" data-confirm="counter-accept" data-notification="${item.id}">Prijmout novy termin</button>
        </div>
      </div>`;
  }
  if (item?.type === "invite" && item.proposalId) {
    const proposal = gameProposals.find((entry) => entry.id === item.proposalId);
    return `
      <div class="modal-body">
        <div>
          <p class="eyebrow">Pozvanka na hru</p>
          <h2 id="modalTitle">${proposal?.title || "Navrh hry"}</h2>
          <p class="muted">${proposal?.court || item.meta}. Po potvrzeni se stav ukaze zvoucimu hraci.</p>
        </div>
        <div class="profile-list">
          <div class="profile-row"><span>Typ</span><span>${proposal?.gameType === "single" ? "Single - 2 hraci" : "Double - 4 hraci"}</span></div>
          <div class="profile-row"><span>Stav</span><span>${proposal?.state || item.status}</span></div>
        </div>
        <div class="inline-actions">
          <button class="secondary-button" data-confirm="decline-invite" data-proposal-id="${item.proposalId}">Odmitnout</button>
          <button class="primary-button" data-confirm="accept-invite" data-proposal-id="${item.proposalId}">Potvrdit ucast</button>
        </div>
      </div>
    `;
  }
  if (item?.type === "invite" && item.reservationIndex !== undefined) {
    const reservation = personalReservations[item.reservationIndex] || personalReservations[0];
    return `
      <div class="modal-body">
        <div>
          <p class="eyebrow">Pozvanka jako nahradnik</p>
          <h2 id="modalTitle">${reservationDateLabel(reservation)} ${reservation.start}-${reservation.end}</h2>
          <p class="muted">${reservation.court.name}, ${reservation.court.surface}. Po potvrzeni se objevis v sestave jako nahradnik a oznameni zmizi.</p>
        </div>
        <div class="profile-list">
          <div class="profile-row"><span>Typ hry</span><span>${reservationGameLabel(reservation)}</span></div>
          <div class="profile-row"><span>Stav</span><span>${item.status}</span></div>
        </div>
        <div class="inline-actions">
          <button class="secondary-button" data-confirm="decline-replacement-invite" data-notification="${item.id}">Odmitnout</button>
          <button class="primary-button" data-confirm="accept-replacement-invite" data-notification="${item.id}">Potvrdit ucast</button>
        </div>
      </div>
    `;
  }
  if (item?.type === "friend-request") {
    const sender = playerRecordById(item.requestFrom);
    return `
      <div class="modal-body">
        <div class="profile-hero">
          <span class="avatar profile-avatar" data-player="${sender?.id || ""}">${avatarContent(sender)}</span>
          <div>
            <p class="eyebrow">Kamaradstvi</p>
            <h2 id="modalTitle">${sender?.name || "Hrac"} chce byt kamarad</h2>
            <p class="muted">Po potvrzeni se budete navzajem videt v sekci Moji kamaradi a portal vas muze prednostne nabidnout do singlu, deblu nebo jako nahradnika.</p>
          </div>
        </div>
        <div class="inline-actions">
          <button class="secondary-button" data-confirm="decline-friend" data-notification="${item.id}">Odmitnout</button>
          <button class="primary-button" data-confirm="accept-friend" data-notification="${item.id}">Potvrdit kamaradstvi</button>
        </div>
      </div>
    `;
  }
  if (item?.type === "friend-accepted") {
    return `
      <div class="modal-body">
        <div>
          <p class="eyebrow">Kamaradstvi potvrzeno</p>
          <h2 id="modalTitle">${item.title}</h2>
          <p class="muted">${item.meta}</p>
        </div>
        <button class="primary-button" data-confirm="dismiss-notification" data-notification="${item.id}">Rozumim</button>
      </div>
    `;
  }
  if (item?.type === "order-ready") {
    const order = playerOrders.find((entry) => entry.id === item.orderId);
    return `
      <div class="modal-body">
        <div>
          <p class="eyebrow">Klubovy obchod</p>
          <h2 id="modalTitle">${item.title}</h2>
          <p class="muted">${item.meta}</p>
        </div>
        ${order ? `<div class="profile-list"><div class="profile-row"><span>Produkt</span><span>${order.product}</span></div><div class="profile-row"><span>Predani</span><span>${orderDeliveryLabel(order)}</span></div><div class="profile-row"><span>Stav</span><span>${order.status}</span></div></div>` : ""}
        <button class="primary-button" data-confirm="dismiss-notification" data-notification="${item.id}">Rozumim</button>
      </div>
    `;
  }
  if (item?.type === "event-announcement" || item?.type === "event-cancelled") {
    const event = events.find((entry) => entry.id === item.eventId);
    const thumb = eventThumbnail(event?.thumbnail || "rackets");
    return `
      <div class="modal-body">
        ${event ? `<img class="modal-court-image event-hero-image" src="${thumb.image}" alt="${thumb.label}">` : ""}
        <div>
          <p class="eyebrow">${item.type === "event-cancelled" ? "Zrusena akce" : "Nova akce"}</p>
          <h2 id="modalTitle">${event?.title || item.title}</h2>
          <p class="muted">${item.meta}</p>
        </div>
        <div class="inline-actions">
          <button class="secondary-button" data-confirm="dismiss-notification" data-notification="${item.id}">Zavrit zpravu</button>
          ${item.type === "event-announcement" && event ? `<button class="primary-button" data-confirm="accept-event" data-event="${event.id}" data-notification="${item.id}">Zucastnim se</button>` : ""}
        </div>
      </div>
    `;
  }
  if (item?.type === "event-invite") {
    const event = events.find((entry) => entry.id === item.eventId) || events[0];
    const thumb = eventThumbnail(event.thumbnail || "rackets");
    return `
      <div class="modal-body">
        <img class="modal-court-image event-hero-image" src="${thumb.image}" alt="${thumb.label}">
        <div>
          <p class="eyebrow">Pozvanka na akci</p>
          <h2 id="modalTitle">${event.title}</h2>
          <p class="muted">${event.meta}. Po potvrzeni se akce prida do tvych rezervaci/kalendaru.</p>
        </div>
        <div class="inline-actions">
          <button class="secondary-button" data-confirm="decline-event" data-notification="${item.id}">Odmitnout</button>
          <button class="primary-button" data-confirm="accept-event" data-event="${event.id}" data-notification="${item.id}">Zucastnim se</button>
        </div>
      </div>
    `;
  }
  if (item?.type === "replacement") {
    const candidate = playerRecordById(item.candidateId) || playerRecordById("filip");
    const reservation = personalReservations[item.reservationIndex || 0] || personalReservations[0];
    return `
      <div class="modal-body">
        <div>
          <p class="eyebrow">Hlasovani o nahradnikovi</p>
          <h2 id="modalTitle">${candidate.name}</h2>
          <p class="muted">${reservationDateLabel(reservation)} ${reservation.start}-${reservation.end}, ${reservation.court.name}. Hlas potvrdi nahradnika do sestavy.</p>
        </div>
        <div class="profile-list">
          <div class="profile-row"><span>Typ hry</span><span>${reservationGameLabel(reservation)}</span></div>
          <div class="profile-row"><span>Kandidat</span><span>${candidate.name} · ${candidate.level}</span></div>
          <div class="profile-row"><span>Proc on</span><span>${candidate.lastPlayed || "hraje podobne terminy"}</span></div>
        </div>
        <button class="primary-button" data-confirm="replacement" data-reservation="${item.reservationIndex || 0}" data-candidate="${item.candidateId || candidate.id}">Hlasovat pro nahradnika</button>
      </div>
    `;
  }
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Zpravy v portalu</p>
        <h2 id="modalTitle">Tok kolem rezervace</h2>
        <p class="muted">Rezervace posila pripominky, potvrzeni ucasti, omluvy, protinavrhy a vyzvy na nahradniky.</p>
      </div>
      <button class="primary-button" data-action="attendance">Otevrit potvrzeni ucasti</button>
    </div>
  `;
}

function busyModal(data = {}) {
  const requested=timeToMinutes(data.time||club.open); const alternatives=[];
  for(const offset of [0,30,-30,60,-60,90,-90]) for(const court of courts){const time=minutesToTime(requested+offset);if(timeToMinutes(time)>=timeToMinutes(club.open)&&timeToMinutes(time)<timeToMinutes(club.close)&&slotType(court,time)==="free"&&!alternatives.some((item)=>item.court.id===court.id&&item.time===time)) alternatives.push({court,time});if(alternatives.length>=4)break;}
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Obsazeno</p>
        <h2 id="modalTitle">Tento cas neni volny</h2>
        <p class="muted">Vybral jsem nejblizsi skutecne volne varianty pro ${formatPortalDate(selectedBookingDateObject(), false)}.</p>
      </div>
      <div class="profile-list">${alternatives.map((item)=>`<button class="profile-row row-button" data-action="book" data-court="${item.court.name}" data-time="${item.time}"><span><strong>${item.court.name}</strong><small>${item.court.surface}</small></span><span>${item.time}</span></button>`).join("")||`<div class="profile-row"><span>V tento den uz neni blizky volny termin.</span></div>`}</div>
      <button class="secondary-button" data-confirm="close">Zavrit</button>
    </div>
  `;
}

function eventAdminModal() {
  if (state.role !== "admin") {
    return `
      <div class="modal-body">
        <div>
          <p class="eyebrow">Jen spravce</p>
          <h2 id="modalTitle">Klubove akce vytvari spravce</h2>
          <p class="muted">Hrac muze akci zobrazit, prihlasit se nebo pozvat kamarady.</p>
        </div>
        <button class="primary-button" data-confirm="close">Zavrit</button>
      </div>
    `;
  }
  const options = eventThumbnails.map((thumb) => `<option value="${thumb.id}">${thumb.label}</option>`).join("");
  const defaultDate = new Date(appToday.getFullYear(), appToday.getMonth(), appToday.getDate() + 7);
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Administrace</p>
        <h2 id="modalTitle">Pridat klubovou akci</h2>
      </div>
      <div class="form-grid">
        <div class="field"><label>Nazev akce</label><input id="eventTitleInput" value="Testovani raket"></div>
        <div class="field"><label>Datum</label><input id="eventDateInput" type="date" value="${dateInputValue(defaultDate)}"></div>
        <div class="field"><label>Od</label><input id="eventStartInput" type="time" value="10:00"></div>
        <div class="field"><label>Do</label><input id="eventEndInput" type="time" value="14:00"></div>
        <div class="field"><label>Startovne</label><input id="eventFeeInput" value="Zdarma"></div>
        <div class="field"><label>Obrazek akce</label><select id="eventVisualInput">${options}</select></div>
        <div class="field upload-field">
          <label>Vlastni obrazek akce</label>
          <img id="eventCreatePreview" class="upload-preview" src="${eventThumbnails[0].image}" alt="Nahled akce">
          <input id="eventImageUrlInput" type="hidden" value="">
          <label class="secondary-button file-upload-button">Vybrat z telefonu nebo souboru<input type="file" accept="image/*" data-image-upload data-image-kind="event" data-target-id="new" data-preview="eventCreatePreview" data-url-input="eventImageUrlInput"></label>
        </div>
        <div class="field"><label>Detail</label><textarea id="eventDetailInput">Prezentace, testovani a objednavky produktu navazane na obsazenost kurtu.</textarea></div>
      </div>
      <button class="primary-button" data-confirm="event">Ulozit akci</button>
    </div>
  `;
}

function adminCourtModal(data) {
  const existingCourt = courts.find((item) => item.id === data.court);
  const isNew = !existingCourt;
  const court = existingCourt || draftCourt();
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Sprava kurtu</p>
        <h2 id="modalTitle">${isNew ? "Novy kurt" : court.name}</h2>
        <p class="muted">${isNew ? "Pridej dalsi kurt klubu. Hned se objevi v rezervacich, ceniku i dennim prehledu." : "Spravce meni fotku, povrch, barvy, cenu, otevirani a blokace kurtu."}</p>
      </div>
      <img id="courtPhotoPreview" class="modal-court-image" src="${court.photo}" alt="${court.name}">
      <input id="courtPhotoUrlInput" type="hidden" value="${court.photo}">
      <label class="secondary-button file-upload-button">Nahrat vlastni fotku kurtu<input type="file" accept="image/*" data-image-upload data-image-kind="court" data-target-id="${isNew ? "new" : court.id}" data-preview="courtPhotoPreview" data-url-input="courtPhotoUrlInput"></label>
      <div class="form-grid">
        <div class="field"><label>Nazev</label><input id="courtNameInput" value="${court.name}"></div>
        <div class="field"><label>Povrch</label><select id="courtSurfaceInput"><option ${court.surface === "Antuka" ? "selected" : ""}>Antuka</option><option ${court.surface === "Umele" ? "selected" : ""}>Umele</option><option ${court.surface === "Trava" ? "selected" : ""}>Trava</option></select></div>
        <div class="field"><label>Barva stylu</label><input id="courtColorInput" value="${court.color}"></div>
        <div class="field"><label>Otevreno od</label><input id="clubOpenInput" value="${club.open}"></div>
        <div class="field"><label>Otevreno do</label><input id="clubCloseInput" value="${club.close}"></div>
        <div class="field"><label>Zakladni cena / hod</label><input id="courtBasePriceInput" value="${priceRulesForCourt(court)[0]?.price || 180} Kc"></div>
        <div class="field"><label>Automaticky zamek</label><select><option>Pripravit pro pozdeji</option><option>Vypnuto</option><option>Zapnuto</option></select></div>
      </div>
      ${isNew ? `<div class="order-batch-note"><strong>Po ulozeni</strong><small>Kurt dostane prazdny denni rozvrh a zakladni cenovy usek Po-Ne ${club.open}-${club.close}.</small></div>` : priceEditor(court)}
      ${isNew ? "" : `<div class="court-special-panel">
        <div class="period-label"><span>Specialni obsazenost kurtu</span><span>rychla blokace bez bezne rezervace</span></div>
        <div class="special-mini-actions">
          ${specialOccupancyTypes.map((type) => `
            <button data-action="special-occupancy" data-court="${court.id}" data-type="${type.type}" style="--type-color:${type.color}">${type.label}</button>
          `).join("")}
        </div>
      </div>`}
      <div class="inline-actions">
        ${isNew ? `<button class="secondary-button" data-confirm="close">Zrusit</button>` : `<button class="secondary-button" data-confirm="admin-court-delete" data-court="${court.id}">Odebrat kurt</button>`}
        <button class="primary-button" data-confirm="admin-court-save" data-court="${isNew ? "new" : court.id}">${isNew ? "Pridat kurt" : "Ulozit kurt"}</button>
      </div>
    </div>
  `;
}

function adminBookingCreateModal(recurring = false) {
  const roster = adminBookingPlayers();
  const optionList = (emptyLabel = "Nevybran") => `<option value="">${emptyLabel}</option>${roster.map((player) => `<option value="${player.id}" ${player.id === "radim" ? "selected" : ""}>${player.name}</option>`).join("")}`;
  const partnerOptions = `<option value="">Nevybran</option>${roster.map((player) => `<option value="${player.id}">${player.name}</option>`).join("")}`;
  const startDate = selectedBookingDateObject();
  const seriesEnd = new Date(startDate.getFullYear(), startDate.getMonth() + 3, startDate.getDate(), 12);
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">${recurring ? "Trvala rezervace" : "Rucni rezervace"}</p>
        <h2 id="modalTitle">${recurring ? "Kazdy tyden ve stejny cas" : "Pridat rezervaci hraci"}</h2>
        <p class="muted">${recurring ? "Vsechny terminy se nejdriv zkontroluji. Pri jedine kolizi se serie nevytvori castecne." : "Rezervace se ihned propise vybranym hracum i do rozvrhu kurtu."}</p>
      </div>
      <div class="form-grid">
        <div class="field"><label>Nazev</label><input id="adminBookingTitleInput" value="${recurring ? "Trvala klubova rezervace" : "Rucni rezervace"}"></div>
        <div class="field"><label>Prvni termin</label><input id="adminBookingDateInput" type="date" value="${dateInputValue(startDate)}"></div>
        ${recurring ? `<div class="field"><label>Posledni termin sezony</label><input id="adminBookingSeriesEndInput" type="date" value="${dateInputValue(seriesEnd)}"></div>` : ""}
        <div class="field"><label>Kurt</label><select id="adminBookingCourtInput">${courts.map((court) => `<option value="${court.id}">${court.name} · ${court.surface}</option>`).join("")}</select></div>
        <div class="booking-field-grid">
          <div class="field"><label>Od</label><input id="adminBookingStartInput" type="time" step="1800" value="17:00"></div>
          <div class="field"><label>Do</label><input id="adminBookingEndInput" type="time" step="1800" value="19:00"></div>
        </div>
        <div class="field"><label>Typ hry</label><select id="adminBookingGameInput"><option value="double">Double - 4 hraci</option><option value="single">Single - 2 hraci</option></select></div>
        <div class="field"><label>Vlastnik rezervace</label><select id="adminBookingOwnerInput">${optionList("Vyber hrace")}</select></div>
        <div class="field"><label>Spoluhrac 1</label><select id="adminBookingPartner1Input">${partnerOptions}</select></div>
        <div class="field"><label>Spoluhrac 2</label><select id="adminBookingPartner2Input">${partnerOptions}</select></div>
        <div class="field"><label>Spoluhrac 3</label><select id="adminBookingPartner3Input">${partnerOptions}</select></div>
      </div>
      <button class="primary-button" data-confirm="${recurring ? "admin-recurring-create" : "admin-booking-create"}">${recurring ? "Vytvorit celou serii" : "Ulozit rezervaci"}</button>
    </div>
  `;
}

function adminRecurringModal() {
  return adminBookingCreateModal(true);
}

function adminSeriesModal(data = {}) {
  const series = reservationSeries.find((item) => item.id === data.series) || reservationSeries[0];
  if (!series) return busyModal();
  const today = dateToIso(appToday);
  const cancelFrom = today > series.startDate ? today : series.startDate;
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Trvala rezervace</p>
        <h2 id="modalTitle">${series.title}</h2>
        <p class="muted">Ukonceni serie zrusi pouze neodehrane terminy od vybraneho dne. Predchozi historie zustane zachovana.</p>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Vlastnik</span><span>${series.ownerName}</span></div>
        <div class="profile-row"><span>Kurt</span><span>${series.courtName}</span></div>
        <div class="profile-row"><span>Obdobi</span><span>${formatPortalDate(dateFromIso(series.startDate), false)} az ${formatPortalDate(dateFromIso(series.endDate), false)}</span></div>
        <div class="profile-row"><span>Cas</span><span>${series.start}-${series.end}</span></div>
        <div class="profile-row"><span>Typ</span><span>${series.gameType === "single" ? "Single" : "Double"}</span></div>
        <div class="profile-row"><span>Aktivni terminy</span><span>${series.occurrenceCount}</span></div>
      </div>
      ${series.status === "active" ? `
        <div class="field"><label>Zrusit budouci terminy od</label><input id="adminSeriesCancelFromInput" type="date" min="${series.startDate}" max="${series.endDate}" value="${cancelFrom}"></div>
        <button class="danger-button" data-confirm="admin-series-cancel" data-series="${series.id}">Ukoncit budouci terminy</button>
      ` : `<button class="primary-button" data-confirm="close">Zavrit</button>`}
    </div>
  `;
}

function adminReservationModal(data = {}) {
  if (!data.reservationId) return adminBookingCreateModal(false);
  const reservation = reservationById(data.reservationId) || personalReservations[0];
  const attendance = normalizedAttendance(reservation);
  const target = reservationTargetPlayers(reservation);
  const activeCount = attendance.filter(activeForGame).length;
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Sprava rezervace</p>
        <h2 id="modalTitle">${reservation.court.name} ${reservationTimeLabel(reservation)}</h2>
        <p class="muted">${reservationGameLabel(reservation)}. Spravce vidi stav hracu a muze skupine pomoct poslat cilene pozvanky, ale nehlasuje za hrace.</p>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Den</span><span>${reservationDateLabel(reservation)}</span></div>
        <div class="profile-row"><span>Termin</span><span>${reservation.start}-${reservation.end}</span></div>
        <div class="profile-row"><span>Kurt</span><span>${reservation.court.name} · ${reservation.court.surface}</span></div>
        <div class="profile-row"><span>Obsazeni</span><span>${activeCount}/${target}</span></div>
        ${attendance.map((player) => `<div class="profile-row"><span>${player.name}</span><span>${player.status} · ${player.role}</span></div>`).join("")}
      </div>
      <div class="inline-actions">
        <button class="secondary-button" data-confirm="admin-reservation-remind" data-reservation="${reservation.id}">Poslat upozorneni hracum</button>
        <button class="primary-button" data-confirm="close">Zavrit detail</button>
      </div>
    </div>
  `;
}

function legacyAdminPlayerModal(data) {
  const player = adminPlayerDirectory.find((item) => item.id === data.player) || adminPlayerDirectory[0];
  const basePrice = 240;
  const charge = courtCharge(basePrice, 1.5, player);
  const loyalty = loyaltyProgress(player);
  const playerFirstName = player.name.split(" ")[0];
  const orders = playerOrders.filter((order) => order.player.includes(playerFirstName));
  const nextHours = Math.max(0, loyalty.next.hours - player.playedHours);
  return `
    <div class="modal-body player-admin-modal">
      <div class="profile-hero player-hero-card">
        <span class="avatar profile-avatar">${player.initials}</span>
        <div>
          <p class="eyebrow">Sprava hrace</p>
          <h2 id="modalTitle">${player.name}</h2>
          <p class="muted">${player.accountLabel} · ${player.age ? `${player.age} let · ` : ""}${player.level}</p>
        </div>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Typ hrace</span><span>${player.accountLabel}</span></div>
        <div class="profile-row"><span>Kredit celkem</span><span>${formatMoney(totalCredit(player))}</span></div>
        <div class="profile-row"><span>Zaplaceny kredit</span><span>${formatMoney(player.paidCredit)}</span></div>
        <div class="profile-row"><span>Bonusovy kredit</span><span>${formatMoney(player.bonusCredit)}</span></div>
        <div class="profile-row"><span>Sleva celkem</span><span>${player.discount} % · ${player.discountReason}</span></div>
        <div class="profile-row"><span>Rozpad slevy</span><span>${player.baseDiscount} % spravce + ${player.loyaltyDiscount} % vernost</span></div>
        <div class="profile-row"><span>Odehrane hodiny</span><span>${player.playedHours} h · ${loyalty.current.label}</span></div>
        <div class="profile-row"><span>Zakladni sazba Kurt 1 vecer</span><span>${formatMoney(charge.baseHourly)}/h</span></div>
        <div class="profile-row"><span>Final cena hrace</span><span>${formatMoney(charge.finalHourly)}/h po sleve</span></div>
        <div class="profile-row"><span>Modelove strzeni 90 min</span><span>${formatMoney(charge.total)} · uspora ${formatMoney(charge.discountAmount)}</span></div>
        <div class="profile-row"><span>Sezona</span><span>${player.seasonReservations} rezervaci · ${formatMoney(player.seasonSpend)}</span></div>
        <div class="profile-row"><span>Vyzvali ho</span><span>${player.invitedBy}</span></div>
        <div class="profile-row"><span>Potvrzeni den predem</span><span>zapnuto, lze vypnout jednotlive</span></div>
        <div class="profile-row"><span>Kontaktovani</span><span>jen pres portal, telefon skryty</span></div>
        <div class="profile-row"><span>Historie</span><span>${player.record}</span></div>
      </div>
      <div class="loyalty-box">
        <div class="row-top">
          <strong>Vernostni postup</strong>
          <span>${loyalty.done} % do ${loyalty.next.label}</span>
        </div>
        <div class="utilization-bar"><i style="width:${loyalty.done}%"></i></div>
        <small>Po dalsich ${Math.max(0, loyalty.next.hours - player.playedHours)} h se muze navysit vernostni sleva a odemknout nepreveditelne produktove vyhody.</small>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Objednavky</span><span>${orders.length ? orders.map((order) => order.product).join(", ") : "zatim nic aktivniho"}</span></div>
        <div class="profile-row"><span>Prodejni pripominka</span><span>${player.playedHours > 80 ? "pokrocily hrac: vyplet do 30 dni" : "spotrebni zbozi pred dalsi hrou"}</span></div>
        <div class="profile-row"><span>Sber rakety</span><span>pred/po rezervaci, hotovo do dalsi hry</span></div>
      </div>
      <div class="form-grid">
        <div class="field">
          <label>Individualni sleva</label>
          <input type="range" min="0" max="60" value="${player.discount}">
          <small>${player.accountType === "guest" ? "Host ma pevnou cenu, posuvnik je vypnuty v ostre verzi." : "Spravce posuvnikem nastavi celkovou slevu v procentech."}</small>
        </div>
        <div class="field"><label>Poznamka spravce ke sleve</label><textarea>${player.discountReason}</textarea></div>
        <div class="field"><label>Interni poznamky spravce</label><textarea>${visibleAdminNote(player)}</textarea></div>
      </div>
      <div class="inline-actions">
        <button class="primary-button" data-confirm="close">Zavrit</button>
      </div>
    </div>
  `;
}

function adminEventModal(data) {
  const event = events.find((item) => item.id === data.event) || events[1];
  const thumb = eventThumbnail(event.thumbnail || (event.id.includes("doubles") ? "doubles" : event.id.includes("shoes") ? "shoes" : "rackets"));
  const customThumbnail = /^https?:\/\//i.test(event.thumbnail || "");
  const options = `${customThumbnail ? `<option value="${event.thumbnail}" selected>Vlastni obrazek</option>` : ""}${eventThumbnails.map((item) => `<option value="${item.id}" ${item.id === thumb.id ? "selected" : ""}>${item.label}</option>`).join("")}`;
  return `
    <div class="modal-body">
      <img id="adminEventImagePreview" class="modal-court-image event-hero-image" src="${thumb.image}" alt="${thumb.label}">
      <div>
        <p class="eyebrow">Sprava akce</p>
        <h2 id="modalTitle">${event.title}</h2>
        <p class="muted">${event.detail}</p>
      </div>
      <div class="form-grid">
        <div class="field"><label>Nazev</label><input id="adminEventTitleInput" value="${event.title}"></div>
        <div class="booking-field-grid">
          <div class="field"><label>Datum</label><input id="adminEventDateInput" type="date" value="${event.isoDate || dateToIso(appToday)}"></div>
          <div class="field"><label>Od</label><input id="adminEventStartInput" type="time" step="1800" value="${event.startTime || "10:00"}"></div>
          <div class="field"><label>Do</label><input id="adminEventEndInput" type="time" step="1800" value="${event.endTime || "12:00"}"></div>
        </div>
        <div class="field"><label>Startovne</label><input id="adminEventFeeInput" value="${event.fee}"></div>
        <div class="field"><label>Podrobnosti</label><textarea id="adminEventDetailInput">${event.detail || ""}</textarea></div>
        <div class="field"><label>Thumbnail</label><select id="adminEventThumbInput">${options}</select></div>
        <div class="field upload-field">
          <label>Vlastni obrazek</label>
          <input id="adminEventImageUrlInput" type="hidden" value="${customThumbnail ? event.thumbnail : ""}">
          <label class="secondary-button file-upload-button">Nahrat novy obrazek<input type="file" accept="image/*" data-image-upload data-image-kind="event" data-target-id="${event.id}" data-preview="adminEventImagePreview" data-url-input="adminEventImageUrlInput"></label>
        </div>
        <div class="field"><label>Prihlaseni</label><div class="participant-table">${event.registered.length ? event.registered.map((name) => `<div class="participant-row"><strong>${name}</strong><span>Prihlasen</span></div>`).join("") : '<p class="empty-note">Zatim se nikdo neprihlasil.</p>'}</div></div>
        <div class="field"><label>Vysledky / historie</label><textarea id="adminEventHistoryInput">${event.history || "Doplnit po akci: vysledky, viteze, fotky, YouTube odkazy."}</textarea></div>
        <div class="field"><label>Duvod zruseni</label><textarea id="adminEventCancelReasonInput">${event.cancelReason || "Mrzi nas to, akci musime zrusit kvuli malemu poctu prihlasenych / organizacnim duvodum."}</textarea></div>
      </div>
      ${event.sourcePollId ? `
        <div class="profile-list">
          <div class="profile-row"><span>Schvaleni obchodnika</span><span>${event.sellerStatus || "ceka"}</span></div>
          <div class="profile-row"><span>Co obchodnik doda</span><span>${event.sellerDelivery || "zatim nepotvrzeno"}</span></div>
          <div class="profile-row"><span>Poznamka obchodnika</span><span>${event.sellerNote || "bez reakce"}</span></div>
        </div>
      ` : ""}
      <div class="inline-actions">
        ${event.status !== "cancelled" ? `<button class="danger-button" data-confirm="admin-event-cancel" data-event="${event.id}">Zrusit akci</button>` : ""}
        ${event.sourcePollId && !platformContext.enabled && event.status !== "seller_confirmed" ? `<button class="secondary-button" data-confirm="seller-request" data-event="${event.id}">Poslat obchodnikovi</button>` : ""}
        <button class="primary-button" data-confirm="${event.sourcePollId && event.status !== "seller_confirmed" ? "admin-event-save" : event.status === "seller_confirmed" ? "event-publish" : "admin-event-save"}" data-event="${event.id}">${event.status === "seller_confirmed" ? "Publikovat hracum" : "Ulozit akci"}</button>
      </div>
    </div>
  `;
}

function sellerEventModal(data) {
  const event = events.find((item) => item.id === data.event) || sellerEvents()[0] || events[0];
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Potvrzeni dodavatele</p>
        <h2 id="modalTitle">${event.title}</h2>
        <p class="muted">Obchodnik potvrdi, jestli zvladne datum, a dopise co presne doda na testovani. Az potom spravce akci publikuje.</p>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Navrzeny termin</span><span>${event.requestedDate || event.meta}</span></div>
        <div class="profile-row"><span>Podklad z ankety</span><span>${event.history || event.detail}</span></div>
      </div>
      <div class="form-grid">
        <div class="booking-field-grid">
          <div class="field"><label>Potvrzeny den</label><input id="sellerEventDateInput" type="date" value="${event.isoDate || dateToIso(appToday)}"></div>
          <div class="field"><label>Od</label><input id="sellerEventStartInput" type="time" step="1800" value="${event.startTime || "10:00"}"></div>
          <div class="field"><label>Do</label><input id="sellerEventEndInput" type="time" step="1800" value="${event.endTime || "14:00"}"></div>
        </div>
        <div class="field"><label>Co dodame na testy</label><textarea id="sellerDeliveryInput">${event.sellerDelivery || "Rakety/modely/velikosti podle vysledku ankety, demo sada na klub den pred akci."}</textarea></div>
        <div class="field"><label>Reakce obchodnika spravci</label><textarea id="sellerNoteInput">${event.sellerNote || "Termin potvrzuji, veci dodame na klub a po akci odvezeme neprodane kusy."}</textarea></div>
      </div>
      <button class="primary-button" data-confirm="seller-confirm-event" data-event="${event.id}">Potvrdit obchodnikem</button>
    </div>
  `;
}

function adminPlayerNewModal() {
  if (!isPrimaryClubAdmin()) {
    return `
      <div class="modal-body">
        <div>
          <p class="eyebrow">Jen spravce</p>
          <h2 id="modalTitle">Nove hrace zaklada spravce</h2>
        </div>
        <button class="primary-button" data-confirm="close">Zavrit</button>
      </div>
    `;
  }
  return `
    <div class="modal-body player-admin-modal">
      <div>
        <p class="eyebrow">Novy ucet</p>
        <h2 id="modalTitle">Pridat ucet do klubu</h2>
        <p class="muted">Hlavni spravce muze zalozit hrace i provozniho spravce klubu. Moduly muze menit jen hlavni spravce.</p>
      </div>
      <div class="form-grid">
        <div class="field"><label>Jmeno</label><input id="newPlayerNameInput" value=""></div>
        <div class="field"><label>E-mail</label><input id="newPlayerEmailInput" type="email" value=""></div>
        <div class="field"><label>Heslo</label><input id="newPlayerPasswordInput" value="siruch-hrac"></div>
        <div class="field"><label>Role uctu</label><select id="newPlayerRoleInput"><option value="player">Hrac</option><option value="manager">Spravce klubu</option><option value="coach">Trener</option><option value="stringer">Vypletac</option><option value="seller">Obchodnik</option></select></div>
        <div class="field"><label>Typ hrace</label><select id="newPlayerTypeInput"><option value="club">Klub - rocni prispevek</option><option value="credit">Kreditovy hrac</option><option value="guest">Host</option></select></div>
        <div class="field"><label>Pohlavi</label><select id="newPlayerGenderInput"><option value="male">Muz</option><option value="female">Zena</option></select></div>
        <div class="field"><label>Pocatecni kredit</label><input id="newPlayerCreditInput" type="number" min="0" step="100" value="0"></div>
        <div class="field"><label>Zakladni sleva %</label><input id="newPlayerDiscountInput" type="number" min="0" max="60" value="0"></div>
      </div>
      <button class="primary-button" data-confirm="admin-player-create">Vytvorit hrace</button>
    </div>
  `;
}

function adminPaymentModal() {
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Klubovy kredit</p>
        <h2 id="modalTitle">Rucni pripis kreditu</h2>
        <p class="muted">Spravce potvrdi skutecne prijatou castku v karte hrace. System automaticky prida nejvyssi odpovidajici bonus a zachova auditni historii.</p>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Prijato klubem</span><span>3 000 Kc</span></div>
        <div class="profile-row"><span>Bonus klubu</span><span>+100 Kc</span></div>
        <div class="profile-row"><span>Pripsat do kreditu</span><span>3 100 Kc</span></div>
        <div class="profile-row"><span>Auditni evidence</span><span>3 000 prijato · 100 bonus</span></div>
      </div>
      <button class="primary-button" data-confirm="close">Rozumim</button>
    </div>
  `;
}

function adminSettingsModal() {
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Konfigurace</p>
        <h2 id="modalTitle">Nastaveni portalu</h2>
        <p class="muted">Toto je zaklad pro nasazeni na jiny klub bez uprav kodu.</p>
      </div>
      <div class="form-grid">
        <div class="field"><label>Nazev klubu</label><input id="clubNameInput" value="${club.name}"></div>
        <div class="field"><label>Logo - text/inicialy</label><input id="clubLogoTextInput" value="${club.logoText || ""}" placeholder="SS"></div>
        <div class="field upload-field"><label>Logo klubu</label><img id="clubLogoPreview" class="upload-preview logo-preview" src="${club.logoUrl || "assets/club-logo-dm-192.png"}" alt="Logo klubu"><input id="clubLogoUrlInput" type="hidden" value="${club.logoUrl || ""}"><label class="secondary-button file-upload-button">Vybrat logo<input type="file" accept="image/*" data-image-upload data-image-kind="club-logo" data-target-id="club" data-preview="clubLogoPreview" data-url-input="clubLogoUrlInput"></label></div>
        <div class="field"><label>Otevreno od</label><input id="clubOpenSettingsInput" value="${club.open}"></div>
        <div class="field"><label>Zavreno</label><input id="clubCloseSettingsInput" value="${club.close}"></div>
        <div class="field"><label>Zruseni nove rezervace do</label><input id="clubCancellationMinutesInput" type="number" min="0" max="10080" step="5" value="${club.cancellationMinutes ?? 30}"><small>Minuty od vytvoreni. Hodnota 0 zruseni hracem vypne.</small></div>
        <div class="field"><label>Potvrzeni ucasti</label><select><option>Den pred terminem</option><option>Vypnuto</option><option>Jen trvale rezervace</option></select></div>
        <div class="field"><label>Hoste</label><select><option>Povolit s jednorazovym kodem</option><option>Jen po schvaleni spravcem</option><option>Vypnuto</option></select></div>
      </div>
      <button class="primary-button" data-confirm="admin-settings-save">Ulozit nastaveni</button>
    </div>
  `;
}

function adminInviteModal(data) {
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Last minute</p>
        <h2 id="modalTitle">Pozvat hrace na volny kurt</h2>
        <p class="muted">Spravce muze poslat cilene pozvani hraci, ktery podle historie pravdepodobne prijde.</p>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Hrac</span><span>${data.player || "Robin"}</span></div>
        <div class="profile-row"><span>Kurt</span><span>${data.court || "Kurt 3"}</span></div>
        <div class="profile-row"><span>Termin</span><span>${data.time || "Dnes 14:30"}</span></div>
        <div class="profile-row"><span>Nabidka</span><span>cilena, bez verejneho casovace, maximalne parkrat za mesic</span></div>
      </div>
      <div class="form-grid">
        <div class="field"><label>Zprava</label><textarea>Ahoj, mame volny kurt a podle historie by se ti mohl hodit. Chces jit hrat?</textarea></div>
        <div class="field"><label>Akce pro vytizeni</label><select><option>Bez slevy</option><option>Bonusovy kredit 50 Kc</option><option>Mimo spicku -15 %</option><option>Pozvat i kamarady hrace</option></select></div>
      </div>
      <button class="primary-button" data-confirm="admin-invite" data-player="${data.player || "Robin"}" data-court="${data.court || "Kurt 3"}" data-time="${data.time || "Dnes 14:30"}">Poslat pozvanku</button>
    </div>
  `;
}

function creditBonusModal(data) {
  const rule = creditBonusRules.find((item) => item.id === data.package || item.name === data.package);
  const draft = rule || { id: "", name: "", paid: 3000, bonus: 100, note: "Bonus podle pravidel klubu." };
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Bonus kreditu</p>
        <h2 id="modalTitle">${rule ? rule.name : "Nove bonusove pravidlo"}</h2>
        <p class="muted">Hrac zaplati skutecne penize, bonus se pripise oddelene. Final cena kurtu se porad pocita ze sazby kurtu a slevy hrace.</p>
      </div>
      <div class="form-grid">
        <div class="field"><label>Nazev</label><input id="creditBonusNameInput" value="${draft.name}"></div>
        <div class="field"><label>Hrac zaplati alespon</label><input id="creditBonusPaidInput" type="number" min="1" step="100" value="${draft.paid}"></div>
        <div class="field"><label>Bonusovy kredit</label><input id="creditBonusBonusInput" type="number" min="0" step="10" value="${draft.bonus}"></div>
        <div class="field"><label>Interni pravidlo</label><textarea id="creditBonusNoteInput">${draft.note}</textarea></div>
      </div>
      <div class="inline-actions">
        ${rule ? `<button class="danger-button" data-confirm="credit-bonus-delete" data-package="${rule.id || rule.name}">Smazat pravidlo</button>` : ""}
        <button class="primary-button" data-confirm="credit-bonus" data-package="${rule?.id || ""}">Ulozit pravidlo</button>
      </div>
    </div>
  `;
}

function manualCreditModal(data) {
  const player = playerRecordById(data.player) || adminPlayerDirectory[0];
  const amount = Number(data.amount || 3000);
  const preview = manualCreditPreview(amount);
  const operationKey = crypto.randomUUID?.() || `credit-operation-${Date.now()}`;
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Rucni dobiti</p>
        <h2 id="modalTitle">Pripsat kredit: ${player.name}</h2>
        <p class="muted">Zadej skutecne prijatou castku. Bonus vybira system automaticky podle nejvyssi dosazene hranice klubu.</p>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Aktualni zustatek</span><strong>${formatMoney(totalCredit(player))}</strong></div>
        <div class="profile-row"><span>Zaplaceny kredit</span><span>${formatMoney(player.paidCredit || 0)}</span></div>
        <div class="profile-row"><span>Bonusovy kredit</span><span>${formatMoney(player.bonusCredit || 0)}</span></div>
      </div>
      <div class="form-grid">
        <input id="manualCreditOperationInput" type="hidden" value="${operationKey}">
        <div class="field"><label>Hrac zaplatil</label><input id="manualCreditAmountInput" data-credit-preview type="number" min="1" step="100" value="${amount}"></div>
        <div class="field"><label>Zpusob prijeti klubem</label><select id="manualCreditMethodInput"><option value="cash">Hotovost</option><option value="bank">Bankovni prevod</option><option value="other">Jiny zpusob mimo portal</option></select></div>
        <div class="field"><label>Poznamka</label><textarea id="manualCreditNoteInput">Rucni dobiti na klubu</textarea></div>
      </div>
      <div class="player-focus-card" id="manualCreditPreview">
        <div class="row-top"><span><b>Pripise se</b><small>${preview.rule?.name || "Bez bonusoveho pravidla"}</small></span><strong>${formatMoney(preview.total)}</strong></div>
        <small>${formatMoney(preview.paid)} zaplaceny kredit + ${formatMoney(preview.bonus)} bonusovy kredit</small>
      </div>
      <button class="primary-button" data-confirm="credit-topup" data-player="${player.id}">Potvrdit prijeti penez a pripsat kredit</button>
    </div>
  `;
}

function habitAlertModal(data) {
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Chytra pozvanka</p>
        <h2 id="modalTitle">Upozornit hrace podle navyku</h2>
        <p class="muted">Toto neni cekaci listina. Portal jen pozna obvykly rytmus hrace a nabidne mu vhodny volny termin.</p>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Hrac</span><span>${data.player || "Robin"}</span></div>
        <div class="profile-row"><span>Volny termin</span><span>${data.time || "Kurt 3 dnes 14:30"}</span></div>
        <div class="profile-row"><span>Proc</span><span>casto hraje podobny den/cas a ma vhodny kredit</span></div>
      </div>
      <div class="form-grid">
        <div class="field"><label>Zprava</label><textarea>Vidime volny termin v case, kdy obvykle chodis hrat. Chces si ho rezervovat?</textarea></div>
        <div class="field"><label>Limit otravnosti</label><select><option>max. 1x tydne</option><option>max. 2x mesicne</option><option>jen kdyz ma kredit</option></select></div>
      </div>
      <button class="primary-button" data-confirm="habit-alert" data-player="${data.player || "Robin"}" data-time="${data.time || "Kurt 3 dnes 14:30"}">Poslat upozorneni</button>
    </div>
  `;
}

function salesCampaignModal(data) {
  const campaign = salesCampaigns.find((item) => item.title === data.campaign) || salesCampaigns[0];
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Partnersky prodej</p>
        <h2 id="modalTitle">${campaign.title}</h2>
        <p class="muted">Model neni klasicky dropshipping na jednotlive adresy. Jedna klubova adresa, jedna demo/prodejni sada, hraci zkousi na miste a vraci se jen jeden balik.</p>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Termin</span><span>${campaign.date}</span></div>
        <div class="profile-row"><span>Spoustec</span><span>${campaign.weather}, ${campaign.occupancy}</span></div>
        <div class="profile-row"><span>Partner</span><span>${campaign.partner}</span></div>
        <div class="profile-row"><span>Vynos</span><span>${campaign.revenue}</span></div>
      </div>
      <div class="form-grid">
        <div class="field"><label>Zprava hracum</label><textarea>Prijd si vyzkouset veci, o ktere jste hlasovali. Mame pro tebe pripraveny vyber na miru - nas zakaznik, nas pan.</textarea></div>
        <div class="field"><label>Rozdeleni prijmu</label><select><option>klub provize + platforma provize</option><option>B2B cena pro klub + platformni fee</option><option>komise z objednavky + servis vypletani</option></select></div>
        <div class="field"><label>Logistika</label><select><option>demo sada predem na klub</option><option>male skladove kusy na klubu</option><option>predobjednavka po ankete</option></select></div>
      </div>
      <button class="primary-button" data-confirm="sales-campaign" data-campaign="${campaign.title}">Pripravit akci</button>
    </div>
  `;
}

function productPollModal(data) {
  const poll = data.poll ? pollById(data.poll) : null;
  if (state.role === "admin" && !poll) {
    return `
      <div class="modal-body">
        <div>
          <p class="eyebrow">Nova anketa</p>
          <h2 id="modalTitle">Co chcete otestovat?</h2>
          <p class="muted">Anketa ma bezet aspon den, idealne nekolik dni. Hracum bez hlasu se muze poslat push pripominka.</p>
        </div>
        <div class="form-grid">
          <div class="field"><label>Otazka</label><input id="pollTitleInput" value="Co chcete otestovat na kurtech?"></div>
          <div class="field"><label>Bezi do</label><input id="pollEndInput" type="date" value="${dateInputValue(new Date(appToday.getFullYear(), appToday.getMonth(), appToday.getDate() + 3))}"></div>
          <div class="field"><label>Moznosti</label><textarea id="pollOptionsInput">A - rakety Babolat
B - rakety Wilson
C - boty Wilson
D - tricka Nike / Puma</textarea></div>
          <div class="field"><label>Pripominky</label><select><option>push 1x denne hracum bez hlasu</option><option>jen jedna pripominka</option><option>bez pripominek</option></select></div>
        </div>
        <button class="primary-button" data-confirm="poll-create">Spustit anketu</button>
      </div>
    `;
  }
  if (poll) {
    const winner = pollWinner(poll);
    const voted = pollHasVoted(poll);
    return `
      <div class="modal-body">
        <div>
          <p class="eyebrow">${state.role === "admin" ? "Sprava ankety" : "Anketa klubu"}</p>
          <h2 id="modalTitle">${poll.title}</h2>
          <p class="muted">${poll.question} Bezi do ${poll.end}. ${poll.reminder}</p>
        </div>
        <div class="product-poll-list">
          ${poll.options.map((option) => `
            <button class="product-poll-card poll-option-card ${option.votes.includes(currentPersonaId()) ? "is-voted" : ""}" ${state.role === "admin" ? "" : `data-confirm="poll-vote" data-poll="${poll.id}" data-option="${option.id}"`}>
              <span>
                <strong>${option.label}</strong>
                <small>${option.category} · ${option.logistics}</small>
                <small>${option.votes.length} hlasu · vazena sila ${option.weighted}</small>
              </span>
              <b>${option.votes.includes(currentPersonaId()) ? "muj hlas" : "hlas"}</b>
            </button>
          `).join("")}
        </div>
        <div class="profile-list">
          <div class="profile-row"><span>Vede</span><span>${winner?.label || "zatim nic"}</span></div>
          <div class="profile-row"><span>Frekvence akci</span><span>${poll.cadence}</span></div>
          <div class="profile-row"><span>Dodavatel</span><span>${poll.supplierNote}</span></div>
        </div>
        ${state.role === "admin" ? `
          <div class="booking-field-grid">
            <div class="field"><label>Navrzeny den akce</label><input id="pollEventDateInput" type="date" value="${dateInputValue(nextTournamentSaturday())}"></div>
            <div class="field"><label>Od</label><input id="pollEventStartInput" type="time" step="1800" value="10:00"></div>
            <div class="field"><label>Do</label><input id="pollEventEndInput" type="time" step="1800" value="14:00"></div>
          </div>
          <div class="inline-actions">
            <button class="secondary-button" data-confirm="poll-remind" data-poll="${poll.id}">Pripomenout nehlasujicim</button>
            <button class="primary-button" data-confirm="poll-close" data-poll="${poll.id}">Ukoncit a poslat obchodnikovi</button>
          </div>
        ` : voted ? `<button class="primary-button" data-confirm="close">Hlas ulozen</button>` : ""}
      </div>
    `;
  }
  const item = productPollItems.find((poll) => poll.product === data.product) || productPollItems[0];
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Anketa pred akci</p>
        <h2 id="modalTitle">${item.product}</h2>
        <p class="muted">Do feedu se pusti jen produkty, ktere partner umi snadno dodat. Finalni vyber ridi hlasy, ale aktivni a utracici hraci maji vyssi vahu.</p>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Kategorie</span><span>${item.category}</span></div>
        <div class="profile-row"><span>Hlasy</span><span>${item.votes} bezne / ${item.weighted} vazene</span></div>
        <div class="profile-row"><span>VIP signal</span><span>${item.vipWish}</span></div>
        <div class="profile-row"><span>Dodat na klub</span><span>${item.logistics}</span></div>
      </div>
      <div class="form-grid">
        <div class="field"><label>Pravidlo vyberu</label><select><option>top hlasy + VIP vyjimky</option><option>jen produkty nad limitem hlasu</option><option>jen produkty s dostupnosti do 48 h</option></select></div>
        <div class="field"><label>Text zpravy</label><textarea>Privezeme i vec, kterou sis pral ty. Stav se ji vyzkouset pri klubove akci.</textarea></div>
        <div class="field"><label>Interni poznamka</label><textarea>Vybrat velikosti/gripy podle profilu hracu, predem potvrdit vratku neprodanych kusu.</textarea></div>
      </div>
      <button class="primary-button" data-confirm="product-poll" data-product="${item.product}">Spustit anketu</button>
    </div>
  `;
}

function specialOccupancyModal(data) {
  const type = specialOccupancyTypes.find((item) => item.type === data.type) || specialOccupancyTypes[0];
  const selectedCourt = courts.find((court) => court.id === data.court) || courts[0];
  const start = data.time || "16:00";
  const end = minutesToTime(Math.min(timeToMinutes(club.close), timeToMinutes(start) + 120));
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Blokace kurtu</p>
        <h2 id="modalTitle">${type.label}</h2>
        <p class="muted">${type.note}. V rozvrhu se to bude chovat jako obsazenost, ale s vlastnim popisem, barvou a pravidly prihlaseni.</p>
      </div>
      <div class="form-grid">
        <div class="field"><label>Typ</label><select id="specialTypeInput">${specialOccupancyTypes.map((item) => `<option value="${item.type}" ${item.type === type.type ? "selected" : ""}>${item.label}</option>`).join("")}</select></div>
        <div class="field"><label>Kurt</label><select id="specialCourtInput">${courts.map((court) => `<option value="${court.id}" ${court.id === selectedCourt.id ? "selected" : ""}>${court.name} · ${court.surface}</option>`).join("")}<option value="all">Vsechny kurty</option></select></div>
        <div class="field"><label>Den a datum</label><input id="specialDateInput" type="date" value="${selectedBookingIsoDate()}"></div>
        <div class="field"><label>Nazev blokace</label><input id="specialTitleInput" value="${type.label}"></div>
        <div class="field"><label>Cas od</label><input id="specialStartInput" value="${start}"></div>
        <div class="field"><label>Cas do</label><input id="specialEndInput" value="${end}"></div>
        <div class="field"><label>Vazba</label><select><option>turnaj / akce / produktova prezentace</option><option>trener a skupina hracu</option><option>servis vypletani</option></select></div>
        <div class="field"><label>Poznamka pro hrace</label><textarea id="specialNoteInput">V tomto case probiha ${type.label.toLowerCase()}, bezna rezervace neni dostupna.</textarea></div>
      </div>
      <button class="primary-button" data-confirm="special-occupancy">Ulozit blokaci</button>
    </div>
  `;
}

function legacyProductOrderModal(data) {
  const item = clubShopItems.find((product) => product.title === data.product) || clubShopItems[0];
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Klubovy obchod</p>
        <h2 id="modalTitle">${item.title}</h2>
        <p class="muted">Objednavka mimo akci zustava klubova: vyzvednuti na klubu, test pri rezervaci nebo pridani do nejblizsi demo dodavky.</p>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Typ</span><span>${item.type}</span></div>
        <div class="profile-row"><span>Cena</span><span>${item.price}</span></div>
        <div class="profile-row"><span>Predani</span><span>${item.delivery}</span></div>
        <div class="profile-row"><span>Vyhoda</span><span>club deal + bez reseni vraceni pres internet</span></div>
      </div>
      <div class="form-grid">
        <div class="field"><label>Jak to chci resit</label><select><option>vyzvednout na klubu</option><option>pridat k me pristi rezervaci</option><option>pridat do nejblizsi akce</option><option>zeptat se spravce</option></select></div>
        <div class="field"><label>Poznamka</label><textarea>Velikost, grip, barva nebo termin, kdy chci produkt vyzkouset.</textarea></div>
        <div class="field"><label>Uhrada objednavky</label><select><option>pri prevzeti na klubu</option><option>po dohode se spravcem</option></select></div>
      </div>
      <button class="primary-button" data-confirm="product-order">Odeslat objednavku</button>
    </div>
  `;
}

function productOrderModal(data) {
  const item = clubShopItems.find((product) => product.title === data.product) || clubShopItems[0];
  const reservations = visibleReservations();
  const stringing = isStringingProduct(item.title);
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Klubovy obchod</p>
        <h2 id="modalTitle">${item.title}</h2>
        <p class="muted">${stringing ? "Vyplet se po objednani automaticky posle vypletaci. Spravce vidi jen prehled stavu." : "Objednavka se musi nekam navazat: vyzvednuti na klubu, tvoje pristi rezervace, nebo konkretni klubova akce."}</p>
      </div>
      <input type="hidden" id="orderProductInput" value="${item.title}">
      <div class="profile-list">
        <div class="profile-row"><span>Typ</span><span>${item.type}</span></div>
        <div class="profile-row"><span>Cena</span><span>${item.price}</span></div>
        <div class="profile-row"><span>Vyhoda</span><span>club deal + priprava na klubu</span></div>
      </div>
      <div class="form-grid">
        <div class="field"><label>Jak to chci resit</label><select id="orderDeliveryInput"><option value="pickup">Vyzvednout na klubu</option><option value="reservation" selected>Pridat k me pristi rezervaci</option><option value="event">Pridat do nejblizsi akce</option></select></div>
        <div class="field"><label>Kdy vyzvednout na klubu</label><input id="orderPickupInput" type="date" value="${selectedBookingIsoDate()}"></div>
        <div class="field"><label>Moje rezervace</label><select id="orderReservationInput">${reservations.map((reservation) => `<option value="${reservation.id}">${reservationDateLabel(reservation)} ${reservation.start}, ${reservation.court.name}</option>`).join("")}</select></div>
        <div class="field"><label>Akce</label><select id="orderEventInput">${events.map((event) => `<option value="${event.id}">${event.title} · ${event.meta}</option>`).join("")}</select></div>
        ${stringing ? `
          <div class="field"><label>Raketa</label><input value="Moje hlavni raketa"></div>
          <div class="field"><label>Vyplet</label><select><option>doporucit podle stylu hry</option><option>stejne jako minule</option><option>vice kontroly</option><option>vice komfortu</option></select></div>
          <div class="field"><label>Napeti</label><select><option>doporuci vypletac</option><option>23 kg</option><option>24 kg</option><option>25 kg</option></select></div>
        ` : ""}
        <div class="field"><label>Poznamka</label><textarea id="orderNoteInput">${stringing ? "Stejne jako minule, chci mit raketu hotovou do dalsi hry." : "Velikost, grip, barva nebo co ma spravce nachystat."}</textarea></div>
        <div class="field"><label>Uhrada objednavky</label><select><option>pri prevzeti na klubu</option><option>po dohode se spravcem</option></select></div>
      </div>
      <button class="primary-button" data-confirm="product-order">Odeslat objednavku</button>
    </div>
  `;
}

function adminOrderModal(data) {
  const order = playerOrders.find((item) => item.product === data.product && item.player === data.player) || playerOrders[0];
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Objednavka hrace</p>
        <h2 id="modalTitle">${order.product}</h2>
        <p class="muted">Cil neni prodavat po jednom kusu, ale rozumne spojovat poptavku do klubovych baliku a sluzby napojit na rezervace.</p>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Hrac</span><span>${order.player}</span></div>
        <div class="profile-row"><span>Rezervace</span><span>${order.reservation}</span></div>
        <div class="profile-row"><span>Stav</span><span>${order.status}</span></div>
        <div class="profile-row"><span>Zdroj zbozi</span><span>${order.sourceLabel || "spravce jeste nerozhodl"}</span></div>
        <div class="profile-row"><span>Balik</span><span>${order.batch}</span></div>
        <div class="profile-row"><span>Hodnota</span><span>${order.value ? formatMoney(order.value) : "demo / zaloha"}</span></div>
      </div>
      <div class="partner-strip">
        ${servicePartners.map((partner) => `
          <span><b>${partner.role}</b><small>${partner.name}</small><small>${partner.status}</small></span>
        `).join("")}
      </div>
      <div class="form-grid">
        <div class="field"><label>Dostupnost / umoreni</label><select id="orderSourceInput"><option value="stock" ${order.source === "stock" ? "selected" : ""}>ze skladu klubu</option><option value="supplier" ${order.source === "supplier" ? "selected" : ""}>objednat od dodavatele</option><option value="check" ${order.source === "check" ? "selected" : ""}>overit dostupnost</option></select></div>
        <div class="field"><label>Faze objednavky</label><select id="orderStatusInput">
          <option value="new" ${order.serverStatus === "new" ? "selected" : ""}>nova objednavka</option>
          <option value="checking" ${order.serverStatus === "checking" ? "selected" : ""}>overuji dostupnost</option>
          <option value="ordered" ${order.serverStatus === "ordered" ? "selected" : ""}>objednano u dodavatele</option>
          <option value="preparing" ${order.serverStatus === "preparing" ? "selected" : ""}>pripravuji na klubu</option>
          <option value="ready" ${order.serverStatus === "ready" ? "selected" : ""}>pripraveno k predani</option>
          <option value="completed" ${order.serverStatus === "completed" ? "selected" : ""}>predano hraci</option>
          <option value="cancelled" ${order.serverStatus === "cancelled" ? "selected" : ""}>zruseno</option>
        </select></div>
        <div class="field"><label>Jak vyridit</label><select><option>spojit do kluboveho baliku</option><option>pripravit k rezervaci hrace</option><option>predat vypletaci raket</option><option>pridat do nejblizsi akce</option></select></div>
        <div class="field"><label>Zprava hraci</label><textarea>${order.type === "sluzba" ? "Chces vyplest raketu pred dalsi rezervaci? Muzes ji nechat na klubu po hre a pripravime ji do dalsi hry." : "Mame pro tebe veci k vyzkouseni nebo vyzvednuti pri pristi rezervaci."}</textarea></div>
        <div class="field"><label>Zprava vypletaci / partnerovi</label><textarea>Na klubu jsou rakety ke sberu. Prijed si pro ne a vrat je hotove do dalsich rezervaci hracu.</textarea></div>
        <div class="field"><label>Automaticke pripominky</label><select>${productNudges.map((nudge) => `<option>${nudge.trigger}</option>`).join("")}</select></div>
      </div>
      <button class="primary-button" data-confirm="admin-order" data-player="${order.player}" data-product="${order.product}">Ulozit vyrizeni</button>
    </div>
  `;
}

function orderDetailModal(data) {
  const order = playerOrders.find((item) => item.id === data.order || item.product === data.order) || visiblePlayerOrders()[0] || playerOrders[0];
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Moje objednavka</p>
        <h2 id="modalTitle">${order.product}</h2>
        <p class="muted">${orderDeliveryLabel(order)}</p>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Stav</span><span>${order.status}</span></div>
        <div class="profile-row"><span>Predani</span><span>${orderDeliveryLabel(order)}</span></div>
        <div class="profile-row"><span>Poznamka</span><span>${order.note || order.batch}</span></div>
      </div>
      <button class="primary-button" data-confirm="close">Rozumim</button>
    </div>
  `;
}

function stringingDetailModal(data) {
  const order = stringingOrders.find((item) => item.id === data.stringing) || visibleStringingOrders()[0] || stringingOrders[0];
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Vyplet rakety</p>
        <h2 id="modalTitle">${order.racket}</h2>
        <p class="muted">${order.message || `${order.statusLabel}. Hotovo ma byt ${order.due}.`}</p>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Hrac</span><span>${order.player}</span></div>
        <div class="profile-row"><span>Vyplet</span><span>${order.string}</span></div>
        <div class="profile-row"><span>Napeti</span><span>${order.tension}</span></div>
        <div class="profile-row"><span>Predani</span><span>${order.handoff}</span></div>
        <div class="profile-row"><span>Pristi hra</span><span>${order.reservation}</span></div>
        <div class="profile-row"><span>Poznamka</span><span>${order.note}</span></div>
      </div>
      <button class="primary-button" data-confirm="close">Rozumim</button>
    </div>
  `;
}

function tournamentTables(tournament) {
  if (!tournament.groups?.length) return `<div class="empty-state">Skupiny jeste nejsou vylosovane.</div>`;
  return tournament.groups.map((group) => `
    <div class="tournament-table">
      <div class="table-head"><span>Skupina ${group.name}</span><span>Body</span></div>
      ${(group.table?.length ? group.table : group.players.map((player) => ({ player, points: 0, score: "0:0" }))).map((row, index) => `
        <div class="table-row"><span>${index + 1}. ${row.player}</span><span>${row.points} b · ${row.score}</span></div>
      `).join("")}
    </div>
  `).join("");
}

function knockoutList(tournament) {
  if (!tournament.knockout?.length) return `<div class="empty-state">Pavouk se vytvori po skupinach.</div>`;
  return `
    <div class="tournament-table">
      <div class="table-head"><span>Pavouk</span><span>Vysledek</span></div>
      ${tournament.knockout.map((match) => `
        <div class="table-row"><span>${match.stage}: ${match.playerA} vs ${match.playerB}</span><span>${match.score || "ceka"}</span></div>
      `).join("")}
    </div>
  `;
}

function tournamentDetailModal(data) {
  const tournament = tournamentById(data.tournament);
  const currentName = currentUser.name.split(" ")[0];
  const registered = platformContext.enabled ? tournament.isRegistered : tournament.participants.includes(currentName);
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">${tournament.type === "double" ? "Double turnaj" : "Single turnaj"}</p>
        <h2 id="modalTitle">${tournament.title}</h2>
        <p class="muted">${tournament.date} · uzaverka ${tournament.deadline} · ${tournament.entryFee}</p>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>Stav</span><span>${tournament.status}</span></div>
        <div class="profile-row"><span>Kurty</span><span>${tournament.courts.join(", ")}</span></div>
        <div class="profile-row"><span>Pravidla</span><span>${tournament.rules}</span></div>
      </div>
      <div class="tournament-table">
        <div class="table-head"><span>Prihlaseni</span><span>Status</span></div>
        ${(tournament.type === "double" ? tournament.teams.map((team) => team.name) : tournament.participants).map((name, index) => `<div class="table-row"><span>${index + 1}. ${name}</span><span>prihlasen</span></div>`).join("")}
      </div>
      ${tournamentTables(tournament)}
      ${knockoutList(tournament)}
      ${tournament.status === "registration" && state.role === "player" ? `${tournament.type === "double" && !registered ? `<div class="field"><label>Spoluhrac do paru</label><select id="tournamentPartnerInput"><option value="">Vyber spoluhrace</option>${players.filter((player) => player.id !== currentPersonaId() && platformContext.membersByPersona.get(player.id)).map((player) => `<option value="${platformContext.membersByPersona.get(player.id)}">${player.name}</option>`).join("")}</select></div>` : ""}<button class="primary-button" data-confirm="tournament-register" data-tournament="${tournament.id}">${registered ? "Odhlasit par" : tournament.type === "double" ? "Prihlasit par" : "Prihlasit se"}</button>` : ""}
      <button class="primary-button" data-confirm="close">Zavrit</button>
    </div>
  `;
}

function tournamentAdminModal(data) {
  const tournament = data.tournament ? tournamentById(data.tournament) : null;
  if (!tournament) {
    const tournamentDate = nextTournamentSaturday();
    const deadlineDate = new Date(tournamentDate.getFullYear(), tournamentDate.getMonth(), tournamentDate.getDate() - 2);
    return `
      <div class="modal-body">
        <div>
          <p class="eyebrow">Novy turnaj</p>
          <h2 id="modalTitle">Klubovy turnaj</h2>
          <p class="muted">Single i double: prihlaseni, uzaverka, skupiny, vysledky, pavouk a archiv.</p>
        </div>
        <div class="form-grid">
          <div class="field"><label>Typ</label><select id="tournamentTypeInput"><option value="single">Single</option><option value="double">Double</option></select></div>
          <div class="field"><label>Nazev</label><input id="tournamentTitleInput" value="Klubovy turnaj"></div>
          <div class="field"><label>Datum startu</label><input id="tournamentDateInput" type="date" value="${dateInputValue(tournamentDate)}"></div>
          <div class="field"><label>Cas startu</label><input id="tournamentStartTimeInput" type="time" value="09:00"></div>
          <div class="field"><label>Datum uzaverky</label><input id="tournamentDeadlineInput" type="date" value="${dateInputValue(deadlineDate)}"></div>
          <div class="field"><label>Cas uzaverky</label><input id="tournamentDeadlineTimeInput" type="time" value="20:00"></div>
          <div class="field"><label>Max hracu</label><input id="tournamentMaxInput" value="16"></div>
          <div class="field"><label>Startovne / hrac (Kc)</label><input id="tournamentFeeInput" type="number" min="0" step="50" value="250"><small>Pro turnaj zdarma zadej 0.</small></div>
        </div>
        <button class="primary-button" data-confirm="tournament-create">Vytvorit turnaj</button>
      </div>
    `;
  }
  return `
    <div class="modal-body">
      <div>
        <p class="eyebrow">Sprava ${tournament.type === "double" ? "double" : "single"} turnaje</p>
        <h2 id="modalTitle">${tournament.title}</h2>
        <p class="muted">${tournament.date} · uzaverka ${tournament.deadline} · stav ${tournament.status}</p>
      </div>
      <div class="profile-list">
        <div class="profile-row"><span>${tournament.type === "double" ? "Pary" : "Hraci"}</span><span>${tournament.type === "double" ? tournament.teams.length : tournament.participants.length}/${tournament.type === "double" ? Math.floor(tournament.maxPlayers / 2) : tournament.maxPlayers}</span></div>
        <div class="profile-row"><span>Kurty</span><span>${tournament.courts.join(", ")}</span></div>
        <div class="profile-row"><span>Startovne</span><span>${tournament.entryFee}</span></div>
        <div class="profile-row"><span>Pravidla</span><span>${tournament.rules}</span></div>
      </div>
      ${tournamentTables(tournament)}
      ${knockoutList(tournament)}
      <div class="inline-actions">
        <button class="secondary-button" data-confirm="tournament-groups" data-tournament="${tournament.id}">Uzavrit a losovat skupiny</button>
        <button class="secondary-button" data-confirm="tournament-results" data-tournament="${tournament.id}">Doplnit demo vysledky</button>
        <button class="primary-button" data-confirm="tournament-knockout" data-tournament="${tournament.id}">Vytvorit pavouk</button>
        <button class="secondary-button" data-confirm="tournament-archive" data-tournament="${tournament.id}">Archivovat</button>
      </div>
    </div>
  `;
}

function adminPlayerModal(data) {
  const player = adminPlayerDirectory.find((item) => item.id === data.player) || adminPlayerDirectory[0];
  const charge = courtCharge(240, 1.5, player);
  const loyalty = loyaltyProgress(player);
  const playerFirstName = player.name.split(" ")[0];
  const orders = playerOrders.filter((order) => order.player.includes(playerFirstName));
  const nextHours = Math.max(0, loyalty.next.hours - player.playedHours);
  const creditHistory = playerCreditTransactions(player.id);
  return `
    <div class="modal-body player-admin-modal">
      <div class="profile-hero player-hero-card">
        <span class="avatar profile-avatar" data-player="${player.id}">${avatarContent(player)}</span>
        <div>
          <p class="eyebrow">Sprava hrace</p>
          <h2 id="modalTitle">${player.name}</h2>
          <p class="muted">${player.accountLabel} · ${player.age ? `${player.age} let · ` : ""}${player.level}</p>
        </div>
      </div>

      <div class="player-focus-card">
        <div class="row-top">
          <span><b>Vernostni postup</b><small>${player.playedHours} odehranych hodin</small></span>
          <strong>${loyalty.current.label}</strong>
        </div>
        <div class="utilization-bar"><i style="width:${loyalty.done}%"></i></div>
        <small>${nextHours ? `Jeste ${nextHours} h do ${loyalty.next.label}.` : "Hrac je na nejvyssim dostupnem stupni."} Lepsi nepreveditelne ceny na produkty a akce.</small>
      </div>

      <div class="discount-control-card">
        <div class="row-top">
          <span><b>Sleva od spravce</b><small>${player.discountReason}</small></span>
          <strong id="discountValue">${player.discount} %</strong>
        </div>
        <input class="discount-slider" data-discount-slider data-player="${player.id}" type="range" min="0" max="60" value="${player.discount}">
        <div class="mini-metrics">
          <span><small>Rozpad</small><b id="baseDiscountValue">${player.baseDiscount} % spravce + ${player.loyaltyDiscount} % vernost</b></span>
          <span><small>Final Kurt 1 vecer</small><b id="finalPriceValue">${formatMoney(charge.finalHourly)}/h</b></span>
        </div>
      </div>

      <div class="player-card-grid">
        <div class="player-info-tile credit-tile"><span class="tile-icon">Kc</span><small>Kredit</small><b>${formatMoney(totalCredit(player))}</b><small>${formatMoney(player.paidCredit)} + bonus ${formatMoney(player.bonusCredit)}</small></div>
        <div class="player-info-tile"><span class="tile-icon">h</span><small>Sezona</small><b>${player.seasonReservations} rezervaci</b><small>${formatMoney(player.seasonSpend)}</small></div>
        <div class="player-info-tile"><span class="tile-icon">%</span><small>Model 90 min</small><b>${formatMoney(charge.total)}</b><small>uspora ${formatMoney(charge.discountAmount)}</small></div>
        <div class="player-info-tile"><span class="tile-icon">i</span><small>Historie</small><b>${player.record}</b><small>${player.lastPlayed}</small></div>
      </div>

      <div class="service-card">
        <div class="row-top">
          <span><b>Kredit hrace</b><small>Zaplacena a bonusova cast se uctuji oddelene.</small></span>
          <button class="primary-button" data-action="credit-topup" data-player="${player.id}">Pripsat kredit</button>
        </div>
        <div class="profile-list">
          ${creditHistory.slice(0, 5).map((transaction) => `
            <div class="profile-row"><span><strong>${formatMoney(transaction.paid)} prijato</strong><small>${formatPortalDate(new Date(transaction.createdAt))} · ${transaction.method}</small></span><span>+${formatMoney(transaction.bonus)} bonus</span></div>
          `).join("") || `<div class="profile-row"><span>Bez pohybu</span><span>0</span></div>`}
        </div>
      </div>

      <div class="service-card">
        <div class="row-top">
          <span><b>Objednavky a servis</b><small>${orders.length ? orders.map((order) => order.product).join(", ") : "zatim nic aktivniho"}</small></span>
          <strong>${orders.length}</strong>
        </div>
        <div class="service-steps">
          <span>pred rezervaci</span>
          <span>sber rakety</span>
          <span>vypletac</span>
          <span>hotovo do dalsi hry</span>
        </div>
        <small>${player.playedHours > 80 ? "Pokrocily hrac: poslat pripominku na vyplet nejpozdeji po 30 dnech." : "Nabidnout tenisaky, ponozky a gripy pred dalsi hrou."}</small>
      </div>

      <div class="profile-list profile-list-polished">
        <div class="profile-row"><span>Typ hrace</span><span>${player.accountLabel}</span></div>
        <div class="profile-row"><span>Vyzvali ho</span><span>${player.invitedBy}</span></div>
        <div class="profile-row"><span>Potvrzeni den predem</span><span>zapnuto, lze vypnout jednotlive</span></div>
        <div class="profile-row"><span>Kontaktovani</span><span>jen pres portal, telefon skryty</span></div>
      </div>

      <div class="form-grid">
        <div class="field"><label>Poznamka spravce ke sleve</label><textarea id="discountReasonInput">${player.discountReason}</textarea></div>
        <div class="field"><label>Interni poznamky spravce</label><textarea id="adminNoteInput">${visibleAdminNote(player)}</textarea></div>
      </div>
      <div class="inline-actions">
        <button class="primary-button" data-confirm="admin-player-save" data-player="${player.id}">Ulozit hrace</button>
      </div>
    </div>
  `;
}

function privacyModal() {
  const pushOn = platformNotificationPreferences.push_enabled !== 0;
  const attendanceOn = platformNotificationPreferences.attendance_reminder_enabled !== 0;
  const productOn = platformNotificationPreferences.product_reminder_enabled === 1;
  return `<div class="modal-body"><div><p class="eyebrow">Soukromi</p><h2 id="modalTitle">Moje data a oznameni</h2><p class="muted">Souhlasy jsou verzovane. Export obsahuje jen tvoje data; zadost o vymazani projde kontrolou zakonne archivace plateb.</p></div><div class="form-grid"><label class="profile-row"><span>Push notifikace</span><input id="privacyPushInput" type="checkbox" ${pushOn ? "checked" : ""}></label><label class="profile-row"><span>Pripominka ucasti den predem</span><input id="privacyAttendanceInput" type="checkbox" ${attendanceOn ? "checked" : ""}></label><label class="profile-row"><span>Servisni nabidky a vyplet</span><input id="privacyProductInput" type="checkbox" ${productOn ? "checked" : ""}></label></div><div class="inline-actions"><button class="secondary-button" data-confirm="privacy-export">Stahnout moje data</button><button class="danger-button" data-confirm="privacy-erase">Pozadat o vymazani</button><button class="primary-button" data-confirm="privacy-save">Ulozit volby</button></div></div>`;
}

function connectionsModal() {
  const profile=platformConnections.profile||{}; const connections=platformConnections.connections||[];
  return `<div class="modal-body"><div><p class="eyebrow">Meziklubove propojeni</p><h2 id="modalTitle">Soukromi pratele</h2><p class="muted">Jine kluby nikdy neuvidi jejich seznamy hracu. Najit lze pouze presny identifikator hrace, ktery se sam zverejnil.</p></div><div class="form-grid"><div class="field"><label>Muj identifikator</label><input id="connectionHandleInput" value="${profile.publicHandle||""}" placeholder="napr. radim-tenis"></div><div class="field"><label>Viditelnost</label><select id="connectionVisibilityInput"><option value="private" ${profile.discoverability==="private"?"selected":""}>Soukromy</option><option value="exact-handle" ${profile.discoverability==="exact-handle"?"selected":""}>Najitelny jen presnym ID</option><option value="invite-only" ${profile.discoverability==="invite-only"?"selected":""}>Jen pozvanky</option></select></div><button class="secondary-button" data-confirm="connection-profile">Ulozit viditelnost</button><div class="field"><label>Presne ID jineho hrace</label><input id="connectionSearchInput" placeholder="hrac-id"></div><button class="primary-button" data-confirm="connection-request">Poslat zadost</button></div><div class="profile-list">${connections.map((item)=>`<div class="profile-row"><span><strong>${item.displayName}</strong><small>${item.publicHandle||"soukromy profil"}</small></span><span>${item.status}${item.status==="pending"&&!item.requestedByMe?`<button class="small-button" data-confirm="connection-accept" data-user="${item.userId}">Prijmout</button>`:""}</span></div>`).join("")||`<div class="profile-row"><span>Zatim bez meziklubovych pratel</span></div>`}</div></div>`;
}

async function savePrivacyPreferences(){try{const push=document.querySelector("#privacyPushInput")?.checked!==false;const attendance=document.querySelector("#privacyAttendanceInput")?.checked!==false;const product=document.querySelector("#privacyProductInput")?.checked===true;await platformRequest("/api/v2/me/notification-preferences",{method:"PUT",body:JSON.stringify({pushEnabled:push,attendanceReminderEnabled:attendance,productReminderEnabled:product})});await platformRequest("/api/v2/me/privacy",{method:"PUT",body:JSON.stringify({purpose:"service_notifications",granted:push,policyVersion:platformPrivacy.policyVersion||"2026-08-01"})});platformNotificationPreferences={push_enabled:push?1:0,attendance_reminder_enabled:attendance?1:0,product_reminder_enabled:product?1:0};lastActionMessage="Nastaveni soukromi a oznameni je ulozene.";return true;}catch(error){lastActionMessage=error.message;return false;}}
async function exportMyData(){try{const data=await platformRequest("/api/v2/me/export");const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=`moje-data-${new Date().toISOString().slice(0,10)}.json`;link.click();URL.revokeObjectURL(url);lastActionMessage="Export osobnich dat je pripraveny.";return true;}catch(error){lastActionMessage=error.message;return false;}}
async function requestErasure(){try{await platformRequest("/api/v2/me/privacy-requests",{method:"POST",body:JSON.stringify({type:"erase"})});lastActionMessage="Zadost o vymazani byla bezpecne zaznamenana.";return true;}catch(error){lastActionMessage=error.message;return false;}}
async function saveConnectionProfile(){try{await platformRequest("/api/v2/me/discoverability",{method:"PUT",body:JSON.stringify({publicHandle:document.querySelector("#connectionHandleInput")?.value||"",discoverability:document.querySelector("#connectionVisibilityInput")?.value||"private"})});platformConnections=await platformRequest("/api/v2/me/connections");lastActionMessage="Viditelnost profilu je ulozena.";return true;}catch(error){lastActionMessage=error.message;return false;}}
async function requestGlobalConnection(){try{await platformRequest("/api/v2/connections",{method:"POST",body:JSON.stringify({publicHandle:document.querySelector("#connectionSearchInput")?.value||""})});platformConnections=await platformRequest("/api/v2/me/connections");lastActionMessage="Meziklubova zadost byla odeslana.";return true;}catch(error){lastActionMessage=error.message;return false;}}
async function acceptGlobalConnection(userId){try{await platformRequest(`/api/v2/connections/${userId}/respond`,{method:"POST",body:JSON.stringify({response:"accept"})});platformConnections=await platformRequest("/api/v2/me/connections");lastActionMessage="Propojeni je potvrzene.";return true;}catch(error){lastActionMessage=error.message;return false;}}
async function toggleClubModule(key,enabled){try{const current=platformModules.find((module)=>module.key===key);const result=await platformRequest(`/api/v2/clubs/${platformContext.clubId}/modules/${key}`,{method:"PUT",body:JSON.stringify({enabled:enabled!=="true",config:current?.config||{}})});platformModules=result.modules||[];lastActionMessage=`Modul ${key} je ${enabled==="true"?"vypnuty":"zapnuty"}.`;return true;}catch(error){lastActionMessage=error.message;return false;}}
async function remindReservationPlayers(reservationId){try{const result=await platformRequest(`/api/v2/clubs/${platformContext.clubId}/reservations/${reservationId}/remind`,{method:"POST"});lastActionMessage=`Upozorneni dostalo ${result.recipients||0} hracu.`;return true;}catch(error){lastActionMessage=error.message;return false;}}

function closeModal() {
  modalBackdrop.hidden = true;
  modalContent.innerHTML = "";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activeHelpTour) {
    stopHelpTour();
    return;
  }
  if (event.key !== "Enter" || event.target?.id !== "adminPlayerSearchInput") return;
  event.preventDefault();
  state.adminPlayerSearch = event.target.value.trim();
  render();
});

document.addEventListener("click", async (event) => {
  const helpTourControl = event.target.closest("[data-help-tour]");
  if (helpTourControl) {
    const control = helpTourControl.dataset.helpTour;
    if (control === "close") stopHelpTour();
    else moveHelpTour(control);
    return;
  }
  const role = event.target.closest("[data-role]");
  const nav = event.target.closest("[data-view]");
  const link = event.target.closest("[data-view-link]");
  const action = event.target.closest("[data-action]");
  const day = event.target.closest("[data-day]");
  const calendarDate = event.target.closest("[data-calendar-date]");
  const month = event.target.closest("[data-month-delta]");
  const priceRule = event.target.closest("[data-price-rule]");
  const priceSlot = event.target.closest("[data-price-slot]");
  const toggleSection = event.target.closest("[data-toggle-section]");
  const confirm = event.target.closest("[data-confirm]");

  if (activeHelpTour && (role || nav || link)) stopHelpTour();

  if (role && isLocalTestingMode() && !platformContext.enabled) {
    state.role = role.dataset.role;
    if (role.dataset.persona) setCurrentPersona(role.dataset.persona);
    state.view = "home";
    render();
  }

  if (nav) {
    state.view = nav.dataset.view;
    render();
  }

  if (link) {
    state.view = link.dataset.viewLink;
    render();
  }

  if (day) {
    state.selectedDay = Number(day.dataset.day);
    state.selectedBookingDate = "";
    render();
  }

  if (calendarDate) {
    state.selectedBookingDate = calendarDate.dataset.calendarDate;
    const selected = dateFromIso(state.selectedBookingDate);
    if (selected) {
      const delta = Math.round((selected.getTime() - appToday.getTime()) / 86400000);
      if (delta >= 0 && delta <= 6) state.selectedDay = delta;
    }
    render();
    openModal("book", { time: "17:00" });
  }

  if (month) {
    moveCalendar(Number(month.dataset.monthDelta));
    render();
  }

  if (priceRule) {
    setPriceForm(priceRule.dataset);
  }

  if (priceSlot) {
    const start = priceSlot.dataset.time;
    setPriceForm({
      start,
      end: minutesToTime(Math.min(timeToMinutes(club.close), timeToMinutes(start) + 60)),
      price: priceSlot.dataset.price
    });
  }

  if (toggleSection) {
    const section = toggleSection.dataset.toggleSection;
    if (state.collapsedSections.has(section)) state.collapsedSections.delete(section);
    else state.collapsedSections.add(section);
    render();
  }

  if (action?.dataset.action === "enable-notifications") {
    enablePortalNotifications();
  } else if (action?.dataset.action === "test-app-badge") {
    testAppBadge();
  } else if (action?.dataset.action === "test-android-notification") {
    sendAndroidNotificationTest();
  } else if (action) {
    openModal(action.dataset.action, action.dataset);
  }

  if (confirm) {
    const kind = confirm.dataset.confirm;
    if (kind === "help-start") {
      startHelpTour(confirm.dataset.topic);
      return;
    }
    if (kind === "login-send") {
      if (requestDemoLoginPassword()) {
        modalContent.innerHTML = loginModal();
        showToast("Testovaci heslo je v simulovanem e-mailu.");
      }
      return;
    }
    if (kind === "login-enter") {
      if (await completeDemoLogin()) {
        closeModal();
        render();
        refreshPushSubscription();
        showToast("Prihlaseni probehlo.");
      } else {
        showToast(lastActionMessage || "Prihlaseni se nepodarilo.");
      }
      return;
    }
    if (kind === "logout") {
      await completeLogout();
      closeModal();
      render();
      showToast(lastActionMessage);
      lastActionMessage = "";
      return;
    }
    if (kind === "password-change") {
      if (!await changeOwnPassword()) {
        showToast(lastActionMessage || "Heslo se nepodarilo zmenit.");
        return;
      }
      closeModal();
      render();
      showToast(lastActionMessage);
      lastActionMessage = "";
      return;
    }
    if (kind === "privacy-save" && !await savePrivacyPreferences()) { showToast(lastActionMessage); return; }
    if (kind === "privacy-export" && !await exportMyData()) { showToast(lastActionMessage); return; }
    if (kind === "privacy-erase" && !await requestErasure()) { showToast(lastActionMessage); return; }
    if (kind === "connection-profile" && !await saveConnectionProfile()) { showToast(lastActionMessage); return; }
    if (kind === "connection-request" && !await requestGlobalConnection()) { showToast(lastActionMessage); return; }
    if (kind === "connection-accept" && !await acceptGlobalConnection(confirm.dataset.user)) { showToast(lastActionMessage); return; }
    if (kind === "module-toggle" && !await toggleClubModule(confirm.dataset.module, confirm.dataset.enabled)) { showToast(lastActionMessage); return; }
    if (kind === "accounting-export") { await exportAccountingCsv(); showToast(lastActionMessage); return; }
    if (kind === "admin-reservation-remind" && !await remindReservationPlayers(confirm.dataset.reservation)) { showToast(lastActionMessage); return; }
    if (kind === "admin-player-search") {
      state.adminPlayerSearch = document.querySelector("#adminPlayerSearchInput")?.value?.trim() || "";
      render();
      return;
    }
    if (kind === "admin-player-search-clear") {
      state.adminPlayerSearch = "";
      render();
      return;
    }
    if (kind === "admin-price-save") {
      const courtId = confirm.dataset.court;
      if (!await savePriceRule(courtId)) {
        showToast(lastActionMessage || "Cenovy usek nejde ulozit. Zkontroluj kurt, cas od-do a cenu.");
        lastActionMessage = "";
        return;
      }
      modalContent.innerHTML = adminCourtModal({ court: courtId });
      render();
      showToast(lastActionMessage || "Cenovy usek kurtu je ulozeny.");
      lastActionMessage = "";
      return;
    }
    if (kind === "admin-price-delete") {
      const courtId = confirm.dataset.court;
      if (!await removePriceRule(courtId, confirm.dataset.rule)) {
        showToast(lastActionMessage || "Cenovy usek se nepodarilo odebrat.");
        lastActionMessage = "";
        return;
      }
      modalContent.innerHTML = adminCourtModal({ court: courtId });
      render();
      showToast(lastActionMessage);
      lastActionMessage = "";
      return;
    }
    if (kind === "book" && !await createBookingReservation()) {
      showToast(lastActionMessage || "Rezervaci se nepodarilo vytvorit.");
      return;
    }
    if (kind === "reservation-participants-save" && !await updateReservationParticipants(Number(confirm.dataset.reservation || 0))) {
      showToast(lastActionMessage || "Sestavu se nepodarilo upravit.");
      return;
    }
    if (kind === "reservation-cancel" && !await cancelOwnedReservation(Number(confirm.dataset.reservation || 0))) {
      showToast(lastActionMessage || "Rezervaci se nepodarilo zrusit.");
      return;
    }
    if (kind === "admin-booking-create" && !await createAdminBooking(false)) {
      showToast(lastActionMessage || "Rucni rezervaci se nepodarilo vytvorit.");
      return;
    }
    if (kind === "admin-recurring-create" && !await createAdminBooking(true)) {
      showToast(lastActionMessage || "Trvalou rezervaci se nepodarilo vytvorit.");
      return;
    }
    if (kind === "admin-series-cancel" && !await cancelAdminReservationSeries(confirm.dataset.series)) {
      showToast(lastActionMessage || "Budouci terminy se nepodarilo ukoncit.");
      return;
    }
    if (kind === "cancel" && !await declineReservation(Number(confirm.dataset.reservation || 0))) {
      showToast(lastActionMessage || "Ucast se nepodarilo zrusit.");
      return;
    }
    if (kind === "undo-cancel" && !await undoReservationDecline(Number(confirm.dataset.reservation || 0))) {
      showToast(lastActionMessage || "Omluvenku uz nejde vzit zpet.");
      return;
    }
    if (kind === "find-player") createPlayerSearch();
    if (kind === "join" && confirm.dataset.event) {
      if (!await joinEventForPlayer(confirm.dataset.event)) {
        showToast(lastActionMessage || "Na akci se nepodarilo prihlasit.");
        lastActionMessage = "";
        return;
      }
      persistData();
    }
    if (kind === "guest") state.guestMode = true;
    if (kind === "attendance") confirmAttendanceFromNotification(confirm.dataset.notification);
    if (kind === "decline-attendance") declineAttendanceFromNotification(confirm.dataset.notification);
    if (kind === "invite-game" && confirm.dataset.proposal) {
      const proposalAccepted = platformContext.enabled && confirm.dataset.proposalId
        ? await confirmGameProposalById(confirm.dataset.proposalId)
        : confirmGameProposal(Number(confirm.dataset.proposal || 0));
      if (!proposalAccepted) {
        showToast(lastActionMessage || "Navrh se nepodarilo potvrdit.");
        return;
      }
    }
    if (kind === "invite-game" && !confirm.dataset.proposal) {
      if (!await createGameInvitation()) {
        showToast(lastActionMessage || "Pozvanku se nepodarilo odeslat.");
        return;
      }
    }
    if (kind === "invite-event") createEventInvitation(confirm.dataset.event);
    if (kind === "accept-invite" && !await confirmGameProposalById(confirm.dataset.proposalId)) {
      showToast(lastActionMessage || "Pozvanku se nepodarilo potvrdit.");
      return;
    }
    if (kind === "decline-invite" && !await declineGameProposal(confirm.dataset.proposalId)) {
      showToast(lastActionMessage || "Pozvanku se nepodarilo odmitnout.");
      return;
    }
    if (kind === "accept-event" && !await acceptEventInvite(confirm.dataset.event, confirm.dataset.notification)) {
      showToast(lastActionMessage || "Na akci se nepodarilo prihlasit.");
      lastActionMessage = "";
      return;
    }
    if (kind === "decline-event") {
      if (!await dismissPlatformNotification(confirm.dataset.notification)) {
        showToast(lastActionMessage || "Oznameni se nepodarilo uzavrit.");
        return;
      }
    }
    if (kind === "dismiss-notification") {
      if (!await dismissPlatformNotification(confirm.dataset.notification)) {
        showToast(lastActionMessage || "Oznameni se nepodarilo uzavrit.");
        return;
      }
    }
    if (kind === "friend-request") {
      if (!await createFriendRequest(confirm.dataset.player)) {
        showToast(lastActionMessage || "Zadost o kamaradstvi se nepodarilo odeslat.");
        lastActionMessage = "";
        return;
      }
    }
    if (kind === "accept-friend" && !await acceptFriendRequest(confirm.dataset.notification)) {
      showToast(lastActionMessage || "Kamaradstvi se nepodarilo potvrdit.");
      return;
    }
    if (kind === "decline-friend" && !await declineFriendRequest(confirm.dataset.notification)) {
      showToast(lastActionMessage || "Zadost se nepodarilo odmitnout.");
      return;
    }
    if (kind === "accept-replacement-invite" && !await acceptReplacementInvite(confirm.dataset.notification)) {
      showToast(lastActionMessage || "Souhlas nahradnika se nepodarilo ulozit."); return;
    }
    if (kind === "decline-replacement-invite" && !await declineReplacementInvite(confirm.dataset.notification)) {
      showToast(lastActionMessage || "Odmitnuti nahradnika se nepodarilo ulozit."); return;
    }
    if (kind === "platform-replacement-vote" && !await voteForPlatformReplacement(confirm.dataset.notification)) {
      showToast(lastActionMessage || "Hlas se nepodarilo ulozit."); return;
    }
    if (kind === "counter-send" && !await sendGameCounterproposal(confirm.dataset.proposalId)) {
      showToast(lastActionMessage || "Protinavrh se nepodarilo odeslat."); return;
    }
    if (kind === "counter-accept" && !await respondGameCounterproposal(confirm.dataset.notification, "accept")) {
      showToast(lastActionMessage || "Protinavrh se nepodarilo prijmout."); return;
    }
    if (kind === "counter-decline" && !await respondGameCounterproposal(confirm.dataset.notification, "decline")) {
      showToast(lastActionMessage || "Protinavrh se nepodarilo odmitnout."); return;
    }
    if (kind === "accept-booking-invite" && !await acceptBookingInvite(confirm.dataset.notification)) {
      showToast(lastActionMessage || "Pozvanku se nepodarilo potvrdit.");
      return;
    }
    if (kind === "decline-booking-invite" && !await declineBookingInvite(confirm.dataset.notification)) {
      showToast(lastActionMessage || "Pozvanku se nepodarilo odmitnout.");
      return;
    }
    if (kind === "join-slot") joinOpenSlot(confirm.dataset.court, confirm.dataset.time);
    if (kind === "replacement") acceptReplacementCandidate(Number(confirm.dataset.reservation || 3), confirm.dataset.candidate || "");
    if (kind === "event" && !await saveAdminEvent()) {
      showToast(lastActionMessage || "Akci se nepodarilo vytvorit.");
      lastActionMessage = "";
      return;
    }
    if (kind === "special-occupancy" && !await saveSpecialOccupancy()) {
      showToast(lastActionMessage || "Specialni obsazenost se nepodarilo ulozit.");
      lastActionMessage = "";
      return;
    }
    if (kind === "admin-settings-save" && !await saveAdminSettings()) {
      showToast(lastActionMessage || "Nastaveni klubu se nepodarilo ulozit.");
      lastActionMessage = "";
      return;
    }
    if (kind === "admin-court-save" && !await saveCourtSettings(confirm.dataset.court)) {
      showToast(lastActionMessage || "Kurt se nepodarilo ulozit.");
      lastActionMessage = "";
      return;
    }
    if (kind === "admin-court-delete" && !await removeCourt(confirm.dataset.court)) {
      showToast(lastActionMessage || "Kurt se nepodarilo odebrat.");
      lastActionMessage = "";
      return;
    }
    if (kind === "admin-player-save" && !await saveAdminPlayer(confirm.dataset.player)) {
      showToast(lastActionMessage || "Profil hrace se nepodarilo ulozit.");
      lastActionMessage = "";
      return;
    }
    if (kind === "admin-player-create" && !await createAdminPlayerFromModal()) {
      showToast(lastActionMessage || "Hrace se nepodarilo vytvorit.");
      lastActionMessage = "";
      return;
    }
    if (kind === "admin-event-save" && !await saveAdminEventDetails(confirm.dataset.event)) {
      showToast(lastActionMessage || "Akci se nepodarilo ulozit.");
      lastActionMessage = "";
      return;
    }
    if (kind === "admin-event-cancel" && !await cancelAdminEvent(confirm.dataset.event)) {
      showToast(lastActionMessage || "Akci se nepodarilo zrusit.");
      lastActionMessage = "";
      return;
    }
    if (kind === "seller-request" && !await requestSellerApproval(confirm.dataset.event)) { showToast(lastActionMessage || "Pozadavek se nepodarilo odeslat."); return; }
    if (kind === "seller-confirm-event" && !await sellerConfirmEvent(confirm.dataset.event)) { showToast(lastActionMessage || "Potvrzeni se nepodarilo ulozit."); return; }
    if (kind === "event-publish" && !await publishApprovedEvent(confirm.dataset.event)) { showToast(lastActionMessage || "Akci se nepodarilo publikovat."); return; }
    if (kind === "product-order" && !await createProductOrder()) {
      showToast(lastActionMessage || "Objednavku se nepodarilo odeslat.");
      return;
    }
    if (kind === "admin-order" && !await saveAdminOrder(confirm.dataset.product, confirm.dataset.player)) {
      showToast(lastActionMessage || "Objednavku se nepodarilo ulozit.");
      return;
    }
    if (kind === "admin-invite") sendAdminInvite(confirm.dataset.player, confirm.dataset.court, confirm.dataset.time);
    if (kind === "credit-bonus" && !await saveCreditBonusRule(confirm.dataset.package)) {
      showToast(lastActionMessage || "Bonusove pravidlo se nepodarilo ulozit.");
      lastActionMessage = "";
      return;
    }
    if (kind === "credit-bonus-delete" && !await deleteCreditBonusRule(confirm.dataset.package)) {
      showToast(lastActionMessage || "Bonusove pravidlo se nepodarilo smazat.");
      lastActionMessage = "";
      return;
    }
    if (kind === "credit-topup" && !await applyManualCredit(confirm.dataset.player)) {
      showToast(lastActionMessage || "Kredit se nepodarilo pripsat.");
      lastActionMessage = "";
      return;
    }
    if (kind === "habit-alert") sendHabitAlert(confirm.dataset.player, confirm.dataset.time);
    if (kind === "sales-campaign") prepareSalesCampaign(confirm.dataset.campaign);
    if (kind === "product-poll") launchProductPoll(confirm.dataset.product);
    if (kind === "poll-create" && !await createPollFromModal()) { showToast(lastActionMessage || "Anketu se nepodarilo vytvorit."); return; }
    if (kind === "poll-vote" && !await voteInPoll(confirm.dataset.poll, confirm.dataset.option)) { showToast(lastActionMessage || "Hlas se nepodarilo ulozit."); return; }
    if (kind === "poll-remind" && !await remindPollVoters(confirm.dataset.poll)) { showToast(lastActionMessage || "Pripominku se nepodarilo odeslat."); return; }
    if (kind === "poll-close" && !await closePollToEvent(confirm.dataset.poll)) { showToast(lastActionMessage || "Anketu se nepodarilo uzavrit."); return; }
    if (kind === "tournament-create" && !await createSingleTournamentFromModal()) { showToast(lastActionMessage || "Turnaj se nepodarilo vytvorit."); return; }
    if (kind === "tournament-register" && !await toggleTournamentRegistration(confirm.dataset.tournament)) { showToast(lastActionMessage || "Registraci se nepodarilo zmenit."); return; }
    if (kind === "tournament-groups" && !await generateTournamentGroups(confirm.dataset.tournament)) { showToast(lastActionMessage || "Skupiny se nepodarilo vylosovat."); return; }
    if (kind === "tournament-results" && !await recordDemoTournamentResults(confirm.dataset.tournament)) { showToast(lastActionMessage || "Vysledky se nepodarilo ulozit."); return; }
    if (kind === "tournament-knockout" && !await generateTournamentKnockout(confirm.dataset.tournament)) { showToast(lastActionMessage || "Pavouk se nepodarilo vytvorit."); return; }
    if (kind === "tournament-archive" && !await archiveTournament(confirm.dataset.tournament)) { showToast(lastActionMessage || "Turnaj se nepodarilo archivovat."); return; }
    if (kind === "stringing-at-club" && !await advanceStringingOrder(confirm.dataset.stringing, "at_club")) {
      showToast(lastActionMessage || "Predani rakety se nepodarilo ulozit."); return;
    }
    if (kind === "stringing-pickup" && !await advanceStringingOrder(confirm.dataset.stringing, "with_stringer")) {
      showToast(lastActionMessage || "Prevzeti rakety se nepodarilo ulozit."); return;
    }
    if (kind === "stringing-returned" && !await advanceStringingOrder(confirm.dataset.stringing, "returned_to_club")) {
      showToast(lastActionMessage || "Vraceni rakety se nepodarilo ulozit."); return;
    }
    if (kind === "stringing-ready" && !await advanceStringingOrder(confirm.dataset.stringing, "ready_for_pickup")) {
      showToast(lastActionMessage || "Pripravu rakety se nepodarilo ulozit."); return;
    }
    if (kind === "stringing-delivered" && !await advanceStringingOrder(confirm.dataset.stringing, "delivered")) {
      showToast(lastActionMessage || "Predani hraci se nepodarilo ulozit."); return;
    }
    closeModal();
    render();
    const messages = {
      book: "Rezervace byla ulozena a propsana ostatnim hracum.",
      "reservation-participants-save": "Sestava rezervace je upravena.",
      "reservation-cancel": "Rezervace je zrusena a kurt je znovu volny.",
      cancel: "Ucast byla zrusena. Ostatnim hracum se spustilo hledani nahradnika.",
      "undo-cancel": "Omluvenka je zrusena a nahradnici k terminu jsou uklizeni.",
      "find-player": "Poptavka na spoluhrace je zverejnena.",
      contact: "Zprava hraci je pripravena k odeslani.",
      login: "Overovaci kod by prisel na telefon nebo e-mail.",
      event: "Akce byla ulozena do administrace.",
      join: "Jste prihlasen na akci.",
      invite: "Pozvanka pro kamarada je pripravena.",
      "invite-game": "Pozvanka na hru byla odeslana.",
      "invite-event": "Pozvanka na akci byla odeslana kamaradum.",
      "accept-invite": "Pozvanka je potvrzena a stav se propsal do navrhu hry.",
      "decline-invite": "Pozvanka je odmitnuta a zvouci hrac to uvidi.",
      "accept-event": "Akce je pridana do tveho kalendare.",
      "decline-event": "Pozvanka na akci je odmitnuta.",
      "accept-replacement-invite": "Ucast jako nahradnik je potvrzena.",
      "decline-replacement-invite": "Pozvanka jako nahradnik je odmitnuta.",
      "accept-booking-invite": "Rezervace je potvrzena a propsana do kurtu.",
      "decline-booking-invite": "Rezervace je odmitnuta, slot ceka na dalsiho spoluhrace.",
      counter: "Protinavrh je prijaty, rezervace se zapise obema.",
      "publish-search": "Hledani spoluhrace je zverejnene na portalu.",
      remind: "Upozorneni bylo poslane cele sestave.",
      attendance: "Ucast je potvrzena.",
      "decline-attendance": "Ucast je odmitnuta a system hleda nahradnika.",
      replacement: "Nahradnik s nejvice hlasy byl navrzen sestave.",
      "join-slot": "Poslal ses jako kandidat, skupina te musi potvrdit.",
      pay: "Kredit spravuje klub a rucne ho pripisuje spravce.",
      photo: "Nahrani fotky bude v dalsi iteraci.",
      guest: "Hostovsky tok je pripraveny: kod, rezervace a uhrada na klubu.",
      "admin-settings-save": "Nastaveni klubu je ulozene.",
      "admin-court-save": "Kurt byl ulozen.",
      "admin-court-delete": "Kurt je odebrany z klubu. Posledni kurt zustava chraneny.",
      "admin-player-save": "Karta hrace byla ulozena.",
      "admin-player-create": "Novy hrac je zalozeny a muze se prihlasit e-mailem.",
      "admin-event-save": "Akce a jeji obrazek byly ulozeny.",
      "admin-event-cancel": "Akce je zrusena, prihlasenym hracum prisla omluva.",
      "seller-request": "Navrh akce byl poslan obchodnikovi ke schvaleni.",
      "seller-confirm-event": "Obchodnik potvrdil termin a dodavku.",
      "event-publish": "Akce je publikovana hracum.",
      "admin-price-save": "Cenovy usek kurtu je ulozeny.",
      "admin-price-delete": "Cenovy usek kurtu je odebrany.",
      "admin-invite": "Last minute pozvanka hraci byla odeslana do portalu.",
      "credit-bonus": "Bonus za dobiti kreditu je ulozeny.",
      "credit-bonus-delete": "Bonusove pravidlo je smazane.",
      "credit-topup": "Prijem penez je zaznamenany a kredit vcetne bonusu pripsany hraci.",
      "habit-alert": "Upozorneni podle navyku hrace bylo odeslano.",
      "sales-campaign": "Prodejni akce je pridana mezi akce.",
      "product-poll": "Anketa sortimentu je spustena pro hrace.",
      "poll-create": "Anketa je spustena a hracum bez hlasu prisla pripominka.",
      "poll-vote": "Hlas v ankete je ulozeny.",
      "poll-remind": "Pripominka ankety byla poslana hracum bez hlasu.",
      "poll-close": "Anketa je ukoncena a z vysledku vznikla testovaci akce.",
      "tournament-create": "Single turnaj je vytvoreny.",
      "tournament-register": "Registrace turnaje byla aktualizovana.",
      "tournament-groups": "Prihlasky jsou uzavrene a skupiny vylosovane.",
      "tournament-results": "Demo vysledky skupin jsou doplnene.",
      "tournament-knockout": "Pavouk je vytvoreny podle skupin.",
      "tournament-archive": "Turnaj je ulozeny do archivu.",
      "special-occupancy": "Specialni obsazenost kurtu je pripravena.",
      "product-order": "Objednavka je pripravena pro klubovy obchod.",
      "admin-order": "Objednavka hrace je zarazena do kluboveho baliku.",
      "stringing-pickup": "Vypletac prevzal raketu.",
      "stringing-ready": "Vypletac vratil raketu klubu a hrac dostal zpravu k vyzvednuti na recepci.",
      "stringing-delivered": "Klub oznacil raketu jako predanou hraci.",
      "friend-request": "Zadost o kamaradstvi byla odeslana.",
      "accept-friend": "Kamaradstvi je potvrzene.",
      "decline-friend": "Zadost o kamaradstvi je odmitnuta.",
      "dismiss-notification": "Zprava je zavrena.",
      close: "Zavreno."
    };
    const feedback = lastActionMessage || messages[kind];
    lastActionMessage = "";
    showToast(feedback);
  }
});

document.addEventListener("input", (event) => {
  const discountSlider = event.target.closest("[data-discount-slider]");
  if (discountSlider) updatePlayerDiscount(discountSlider);
  const creditPreviewInput = event.target.closest("[data-credit-preview]");
  if (creditPreviewInput) {
    const preview = manualCreditPreview(creditPreviewInput.value);
    const previewElement = document.querySelector("#manualCreditPreview");
    if (previewElement) {
      previewElement.innerHTML = `
        <div class="row-top"><span><b>Pripise se</b><small>${preview.rule?.name || "Bez bonusoveho pravidla"}</small></span><strong>${formatMoney(preview.total)}</strong></div>
        <small>${formatMoney(preview.paid)} zaplaceny kredit + ${formatMoney(preview.bonus)} bonusovy kredit</small>
      `;
    }
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches?.("#clubSelector")) {
    try { localStorage.setItem(SELECTED_CLUB_KEY, event.target.value); } catch (_) {}
    window.location.reload();
    return;
  }
  const imageInput = event.target.closest("[data-image-upload]");
  if (imageInput) handleImageUpload(imageInput);
});

modalClose.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (event) => {
  if (event.target === modalBackdrop) closeModal();
});

document.querySelector("#loginButton").addEventListener("click", () => openModal("login"));

async function bootPortal() {
  const source = await hydrateStoredData();
  if (source === "seed") persistData();
  let hasSession = false;
  if (platformContext.enabled) {
    try {
      hasSession = await loadPlatformContext();
    } catch (_) {
      state.role = "guest";
      state.view = "home";
    }
  } else {
    hasSession = applyLoginSession();
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      let reloadingForServiceWorker = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloadingForServiceWorker) return;
        reloadingForServiceWorker = true;
        window.location.reload();
      });
      navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((registration) => registration.update()).catch(() => {});
    });
  }

  render();
  startRemoteSync();
  startPlatformSync();
  if (hasSession) refreshPushSubscription();
  if ((!isLocalTestingMode() || platformContext.enabled) && !hasSession && !loginPromptShown) {
    loginPromptShown = true;
    window.setTimeout(() => openModal("login"), 300);
  }
}

bootPortal();
