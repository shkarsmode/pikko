// Strings: [English, Russian, Ukrainian]. {name} placeholders are filled by t().
const S = {
  // modes
  'mode.one': ['One', 'Один', 'Один'],
  'mode.one.d': ['Picks one person', 'Выберет одного', 'Обере одного'],
  'mode.n': ['Several', 'Несколько', 'Кілька'],
  'mode.n.d': ['Picks 2–4 people', 'Выберет 2–4 человек', 'Обере 2–4 людей'],
  'mode.teams': ['Teams', 'Команды', 'Команди'],
  'mode.teams.d': ['Splits into even teams', 'Поделит на равные команды', 'Поділить на рівні команди'],
  'mode.order': ['Order', 'Очередь', 'Черга'],
  'mode.order.d': ['Who goes 1st, 2nd, 3rd…', 'Кто первый, второй, третий…', 'Хто перший, другий, третій…'],
  'mode.elim': ['Knockout', 'Выбывание', 'Вибування'],
  'mode.elim.d': ['Knocks out one by one', 'Выбивает по одному', 'Вибиває по одному'],
  'mode.reaction': ['Reflex', 'Реакция', 'Реакція'],
  'mode.reaction.d': ['Lift on the signal, fastest wins', 'Отпусти по сигналу — кто быстрее', 'Відпусти за сигналом — хто швидше'],

  // idle hints
  'hint.title': ['Place fingers on the screen', 'Положите пальцы на экран', 'Покладіть пальці на екран'],
  'hint.one': ['Hold still and I pick one', 'Держите — выберу одного', 'Тримайте — оберу одного'],
  'hint.n': ['Hold still and I pick {n}', 'Держите — выберу {n}', 'Тримайте — оберу {n}'],
  'hint.teams': ['Hold still for {n} teams', 'Держите — поделю на {n} команды', 'Тримайте — поділю на {n} команди'],
  'hint.order': ['Hold still and I line you up', 'Держите — построю очередь', 'Тримайте — вишикую чергу'],
  'hint.elim': ['Last one standing wins', 'Победит последний оставшийся', 'Переможе останній, хто залишиться'],
  'hint.reaction': ['Hold, then lift on the signal', 'Держите и отпустите по сигналу', 'Тримайте й відпустіть за сигналом'],
  'hint.mouse': ['Mouse: Shift-click adds another finger, Esc lifts them', 'Мышь: Shift+клик — ещё палец, Esc — убрать', 'Миша: Shift+клік — ще палець, Esc — прибрати'],
  'sound.tap': ['Tap once to turn on sound', 'Коснитесь, чтобы включить звук', 'Торкніться, щоб увімкнути звук'],
  'hint.min': ['{n}+ players', 'от {n} игроков', 'від {n} гравців'],
  'hint.mk.title': ['Everyone tap near your seat', 'Каждый — коснитесь экрана у себя', 'Кожен — торкніться екрана біля себе'],
  'hint.mk.sub': ['No holding. Then press Pick', 'Держать не нужно. Потом «Выбрать»', 'Тримати не треба. Потім «Обрати»'],

  // in-game captions
  'cap.wait': ['Waiting for more players…', 'Ждём ещё игроков…', 'Чекаємо ще гравців…'],
  'cap.winner': ['Chosen!', 'Выбран!', 'Обрано!'],
  'cap.winners': ['Chosen: {n}', 'Выбраны: {n}', 'Обрано: {n}'],
  'cap.order': ['The order is set', 'Очередь готова', 'Черга готова'],
  'cap.last': ['Last one standing!', 'Остался один!', 'Залишився один!'],
  'cap.ready': ['Get ready…', 'Приготовьтесь…', 'Приготуйтеся…'],
  'cap.ready.sub': ['Lift your finger on the signal', 'Отпустите палец по сигналу', 'Відпустіть палець за сигналом'],
  'cap.go': ['LIFT!', 'ОТПУСКАЙ!', 'ВІДПУСКАЙ!'],
  'cap.false': ['False start!', 'Фальстарт!', 'Фальстарт!'],
  'cap.allFalse': ['Everyone jumped the gun', 'Все поспешили', 'Усі поспішили'],
  'cap.fast': ['Fastest!', 'Быстрее всех!', 'Найшвидший!'],
  'cap.solo': ['Everyone else jumped the gun', 'Остальные поспешили', 'Решта поспішили'],
  'cap.ms': ['{n} ms', '{n} мс', '{n} мс'],
  'team': ['Team {n}', 'Команда {n}', 'Команда {n}'],

  // toasts
  'toast.tooMany': ['iPhone tracks up to 5 fingers. Big group? Turn on Markers', 'iPhone видит до 5 пальцев. Большая компания? Включите «Метки»', 'iPhone бачить до 5 пальців. Велика компанія? Увімкніть «Мітки»'],
  'toast.cancel': ['Touch interrupted, try again', 'Касание прервано, ещё раз', 'Дотик перервано, ще раз'],
  'toast.mkMax': ['Up to {n} markers', 'Не больше {n} меток', 'Не більше {n} міток'],
  'toast.noReaction': ['Reflex needs fingers held down, Markers are off', 'В «Реакции» пальцы держат, «Метки» выключены', 'У «Реакції» пальці тримають, «Мітки» вимкнено'],
  'toast.demo': ['Demo only', 'Это демо', 'Це демо'],
  'toast.reset': ['Demo purchase reset', 'Демо-покупка сброшена', 'Демо-покупку скинуто'],
  'toast.trialEnded': ['Your trial ended, Premium is locked again', 'Пробный период закончился', 'Пробний період закінчився'],
  'toast.offline': ['Ready to work offline', 'Готово к работе офлайн', 'Готово до роботи офлайн'],

  // markers
  'mk.name': ['Markers', 'Метки', 'Мітки'],
  'mk.d': ['6+ players: each taps once, no holding', '6+ игроков: каждый касается один раз', '6+ гравців: кожен торкається один раз'],
  'mk.go': ['Pick', 'Выбрать', 'Обрати'],
  'mk.clear': ['Clear', 'Очистить', 'Очистити'],
  'mk.again': ['Again', 'Ещё раз', 'Ще раз'],
  'mk.new': ['New round', 'Заново', 'Заново'],

  // mode sheet
  'sheet.mode': ['Mode', 'Режим', 'Режим'],
  'opt.n': ['How many to pick', 'Сколько выбрать', 'Скільки обрати'],
  'opt.teams': ['How many teams', 'Сколько команд', 'Скільки команд'],
  'opt.input': ['Big group', 'Большая компания', 'Велика компанія'],

  // settings
  'set.title': ['Settings', 'Настройки', 'Налаштування'],
  'set.game': ['Game', 'Игра', 'Гра'],
  'set.speed': ['Countdown', 'Отсчёт', 'Відлік'],
  'speed.fast': ['Fast', 'Быстро', 'Швидко'],
  'speed.normal': ['Normal', 'Обычно', 'Звично'],
  'speed.slow': ['Slow', 'Медленно', 'Повільно'],
  'set.sound': ['Sound', 'Звук', 'Звук'],
  'set.sound.n': ['Follows the silent switch', 'Слушается переключателя «Без звука»', 'Слухається перемикача «Без звуку»'],
  'set.haptics': ['Haptics', 'Тактильный отклик', 'Тактильний відгук'],
  'hap.android': ['Vibrates on every pick', 'Вибрация на каждом выборе', 'Вібрація на кожному виборі'],
  'hap.ios': ['iPhone: full haptics on iOS 18–26.4. Newer iOS lets the web tick only on switch taps', 'iPhone: полный отклик на iOS 18–26.4. В новых iOS сайт может «щёлкать» только на переключателях', 'iPhone: повний відгук на iOS 18–26.4. У нових iOS сайт може «клацати» лише на перемикачах'],
  'hap.none': ['Not available on this device', 'Недоступно на этом устройстве', 'Недоступно на цьому пристрої'],
  'set.palette': ['Colors', 'Цвета', 'Кольори'],
  'pal.neon': ['Neon', 'Неон', 'Неон'],
  'pal.pastel': ['Pastel', 'Пастель', 'Пастель'],
  'pal.sunset': ['Sunset', 'Закат', 'Захід'],
  'set.lang': ['Language', 'Язык', 'Мова'],
  'lang.auto': ['Auto', 'Авто', 'Авто'],
  'set.premium': ['Premium', 'Premium', 'Premium'],
  'prem.on': ['Premium is on (demo)', 'Premium включён (демо)', 'Premium увімкнено (демо)'],
  'prem.until': ['Trial until {n}', 'Пробный период до {n}', 'Пробний період до {n}'],
  'prem.forever': ['Forever', 'Навсегда', 'Назавжди'],
  'prem.paid': ['Plan: {n}', 'План: {n}', 'План: {n}'],
  'prem.off': ['Free version', 'Бесплатная версия', 'Безкоштовна версія'],
  'prem.get': ['Get Premium', 'Открыть Premium', 'Відкрити Premium'],
  'prem.reset': ['Reset demo purchase', 'Сбросить демо-покупку', 'Скинути демо-покупку'],
  'set.promos': ['Promo screens (demo)', 'Промо-окна (демо)', 'Промо-вікна (демо)'],
  'set.autoPromos': ['Show promos automatically', 'Показывать промо сами', 'Показувати промо самі'],
  'promo.gift': ['Gift', 'Подарок', 'Подарунок'],
  'promo.gift.w': ['first launch', 'первый запуск', 'перший запуск'],
  'promo.paywall': ['Full paywall', 'Полный пейвол', 'Повний пейвол'],
  'promo.paywall.w': ['PRO button, every 3rd launch, every 8th round', 'кнопка PRO, каждый 3-й запуск, каждый 8-й раунд', 'кнопка PRO, кожен 3-й запуск, кожен 8-й раунд'],
  'promo.offer': ['Discount with timer', 'Скидка с таймером', 'Знижка з таймером'],
  'promo.offer.w': ['every 4th round', 'каждый 4-й раунд', 'кожен 4-й раунд'],
  'promo.unlock': ['Locked mode sheet', 'Шторка закрытого режима', 'Шторка закритого режиму'],
  'promo.unlock.w': ['tap a PRO mode or color', 'тап по PRO-режиму или цвету', 'тап по PRO-режиму або кольору'],
  'promo.winback': ['“Don’t go” offer', 'Оффер «Не уходи»', 'Офер «Не йди»'],
  'promo.winback.w': ['return after 30 s, icon shortcut', 'возврат через 30 с, ярлык иконки', 'повернення через 30 с, ярлик іконки'],
  'set.install': ['Install', 'Установка', 'Встановлення'],
  'inst.row': ['Add to Home Screen', 'На экран «Домой»', 'На екран «Додому»'],
  'inst.done': ['Installed', 'Установлено', 'Встановлено'],
  'set.about': ['About', 'О приложении', 'Про застосунок'],
  'about.touches': ['Most fingers seen at once', 'Максимум пальцев сразу', 'Максимум пальців одночасно'],
  'about.limit': ['iPhone tracks up to 5 fingers, iPad up to 11. For more, use Markers', 'iPhone видит до 5 пальцев, iPad — до 11. Для больше — «Метки»', 'iPhone бачить до 5 пальців, iPad — до 11. Для більше — «Мітки»'],
  'about.version': ['Version', 'Версия', 'Версія'],
  'about.resetAll': ['Reset everything (replay first launch)', 'Сбросить всё (как первый запуск)', 'Скинути все (як перший запуск)'],

  // install sheet / banner
  'inst.title': ['Install Pikko', 'Установите Pikko', 'Встановіть Pikko'],
  'inst.s1': ['Tap Share in Safari', 'Нажмите «Поделиться» в Safari', 'Натисніть «Поділитися» в Safari'],
  'inst.s2': ['Choose “Add to Home Screen”', 'Выберите «На экран „Домой“»', 'Оберіть «На екран „Додому“»'],
  'inst.s3': ['Open Pikko from the Home Screen: full screen and offline', 'Откройте Pikko с экрана «Домой»: весь экран и офлайн', 'Відкрийте Pikko з екрана «Додому»: весь екран і офлайн'],
  'inst.banner': ['Add Pikko to your Home Screen', 'Добавьте Pikko на экран «Домой»', 'Додайте Pikko на екран «Додому»'],
  'inst.banner.s': ['Full screen, offline, no browser bars', 'Весь экран, офлайн, без панелей браузера', 'Весь екран, офлайн, без панелей браузера'],
  'inst.how': ['How', 'Как', 'Як'],
  'inst.install': ['Install', 'Установить', 'Встановити'],

  // promo copy
  'gift.t1': ['A gift for you 🎁', 'Это вам — подарок 🎁', 'Це вам — подарунок 🎁'],
  'gift.s1': ['3 days of Premium on us: every mode, markers and colors.', '3 дня Premium за наш счёт: все режимы, метки и цвета.', '3 дні Premium за наш рахунок: усі режими, мітки й кольори.'],
  'gift.t2': ['Welcome to Pikko!', 'Добро пожаловать в Pikko!', 'Ласкаво просимо до Pikko!'],
  'gift.s2': ['Start with 3 free days of Premium. No limits.', 'Начните с 3 бесплатных дней Premium. Без ограничений.', 'Почніть із 3 безкоштовних днів Premium. Без обмежень.'],
  'gift.t3': ['First party’s on us 🥳', 'Первая вечеринка — за наш счёт 🥳', 'Перша вечірка — за наш рахунок 🥳'],
  'gift.s3': ['Everything unlocked for 3 days. Cancel anytime.', 'Всё открыто на 3 дня. Отмена в любой момент.', 'Усе відкрито на 3 дні. Скасування будь-коли.'],
  'pw.t1': ['Pikko Premium', 'Pikko Premium', 'Pikko Premium'],
  'pw.s1': ['More modes, more fun. Still a fair pick.', 'Больше режимов и веселья. Всё так же честно.', 'Більше режимів і веселощів. Так само чесно.'],
  'pw.t2': ['Play it bigger', 'Играйте по-крупному', 'Грайте по-крупному'],
  'pw.s2': ['Groups of any size, dramatic knockouts, reflex duels.', 'Компании любого размера, выбывание и дуэли на реакцию.', 'Компанії будь-якого розміру, вибування й дуелі на реакцію.'],
  'of.t1': ['Today only', 'Только сегодня', 'Лише сьогодні'],
  'of.s1': ['Premium at half price. The offer burns out in', 'Premium за полцены. Предложение сгорит через', 'Premium за пів ціни. Пропозиція згорить через'],
  'of.t2': ['Psst… a secret discount 🤫', 'Тсс… секретная скидка 🤫', 'Тсс… секретна знижка 🤫'],
  'of.s2': ['You play a lot, so Premium is half off. Ends in', 'Вы часто играете — Premium за полцены. Осталось', 'Ви часто граєте — Premium за пів ціни. Залишилось'],
  'of.badge': ['LIMITED OFFER', 'ОГРАНИЧЕННОЕ ПРЕДЛОЖЕНИЕ', 'ОБМЕЖЕНА ПРОПОЗИЦІЯ'],
  'wb.t1': ['Wait, don’t go yet! 🎁', 'Подожди, не уходи! 🎁', 'Зачекай, не йди! 🎁'],
  'wb.s1': ['Here’s a free week of Premium, just for staying.', 'Держи неделю Premium бесплатно — просто за то, что остался.', 'Тримай тиждень Premium безкоштовно — просто за те, що лишився.'],
  'wb.t2': ['Leaving so soon?', 'Уже уходишь?', 'Вже йдеш?'],
  'wb.s2': ['Last chance: 7 days of Premium as a gift.', 'Последний шанс: 7 дней Premium в подарок.', 'Останній шанс: 7 днів Premium у подарунок.'],
  'wb.badge': ['7 DAYS FREE', '7 ДНЕЙ БЕСПЛАТНО', '7 ДНІВ БЕЗКОШТОВНО'],
  'ul.title': ['“{n}” is in Premium', '«{n}» — в Premium', '«{n}» — у Premium'],
  'ul.more': ['Plus every other mode, markers for big groups and color themes', 'И все остальные режимы, метки для больших компаний и цвета', 'І всі інші режими, мітки для великих компаній і кольори'],
  'ul.mk.d': ['Up to 24 players on one phone, no holding.', 'До 24 игроков на одном телефоне, держать не нужно.', 'До 24 гравців на одному телефоні, тримати не треба.'],
  'ul.pal.d': ['Fresh colors for every finger.', 'Новые цвета для каждого пальца.', 'Нові кольори для кожного пальця.'],

  'cta.claim': ['Claim for free', 'Забрать бесплатно', 'Забрати безкоштовно'],
  'cta.later': ['Not now', 'Не сейчас', 'Не зараз'],
  'cta.try': ['Try 3 days free', 'Попробовать 3 дня бесплатно', 'Спробувати 3 дні безкоштовно'],
  'cta.continue': ['Continue', 'Продолжить', 'Продовжити'],
  'cta.offer': ['Get 50% off', 'Забрать скидку', 'Забрати знижку'],
  'cta.noThanks': ['No thanks, I’ll pay full price', 'Нет, заплачу полную цену', 'Ні, заплачу повну ціну'],
  'cta.week': ['Take my free week', 'Забрать неделю бесплатно', 'Забрати тиждень безкоштовно'],
  'cta.leave': ['Leave anyway', 'Всё равно уйти', 'Все одно піти'],
  'cta.all': ['Everything in Premium', 'Всё, что есть в Premium', 'Усе, що є в Premium'],
  'plan.year': ['Yearly', 'Годовой', 'Річний'],
  'plan.week': ['Weekly', 'Недельный', 'Тижневий'],
  'plan.life': ['Lifetime', 'Навсегда', 'Назавжди'],
  'plan.perWeek': ['{n} / week', '{n} в неделю', '{n} на тиждень'],
  'plan.perYear': ['{n} / year', '{n} в год', '{n} на рік'],
  'plan.once': ['{n} once', '{n} один раз', '{n} один раз'],
  'plan.best': ['Best value', 'Выгоднее всего', 'Найвигідніше'],
  'plan.trial': ['3 days free', '3 дня бесплатно', '3 дні безкоштовно'],
  'trial.toggle': ['Free trial', 'Бесплатный пробный период', 'Безкоштовний пробний період'],
  'trial.on': ['3 days free, then {n} a year. Cancel anytime.', '3 дня бесплатно, затем {n} в год. Отмена в любой момент.', '3 дні безкоштовно, далі {n} на рік. Скасування будь-коли.'],
  'trial.off': ['Billed {n}. Cancel anytime.', 'Списание {n}. Отмена в любой момент.', 'Списання {n}. Скасування будь-коли.'],
  'demo.note': ['Demo: nothing is ever charged', 'Демо: ничего не списывается', 'Демо: нічого не списується'],
  'link.restore': ['Restore', 'Восстановить', 'Відновити'],
  'link.terms': ['Terms', 'Условия', 'Умови'],
  'link.privacy': ['Privacy', 'Конфиденциальность', 'Приватність'],
  'feat.modes': ['3 more modes: Several, Knockout, Reflex', 'Ещё 3 режима: Несколько, Выбывание, Реакция', 'Ще 3 режими: Кілька, Вибування, Реакція'],
  'feat.markers': ['Markers: up to 24 players on one phone', 'Метки: до 24 игроков на одном телефоне', 'Мітки: до 24 гравців на одному телефоні'],
  'feat.colors': ['Pastel and Sunset color themes', 'Цвета «Пастель» и «Закат»', 'Кольори «Пастель» і «Захід»'],
  'feat.support': ['Support an indie developer', 'Поддержка независимого разработчика', 'Підтримка незалежного розробника'],
  'buy.busy': ['Processing…', 'Оформляем…', 'Оформлюємо…'],
  'buy.ok': ['Premium is on!', 'Premium включён!', 'Premium увімкнено!'],
  'buy.trial': ['Free until {n}. It’s a demo, nothing was charged.', 'Бесплатно до {n}. Это демо, ничего не списано.', 'Безкоштовно до {n}. Це демо, нічого не списано.'],
  'buy.forever': ['Yours forever. It’s a demo, nothing was charged.', 'Навсегда ваш. Это демо, ничего не списано.', 'Назавжди ваш. Це демо, нічого не списано.'],
  'buy.go': ['Let’s play', 'Поехали', 'Погнали'],

  'a11y.settings': ['Settings', 'Настройки', 'Налаштування'],
  'a11y.mode': ['Choose mode', 'Выбрать режим', 'Обрати режим'],
  'a11y.close': ['Close', 'Закрыть', 'Закрити'],
  'a11y.premium': ['Premium', 'Premium', 'Premium'],
};

const LANGS = ['en', 'ru', 'uk'];
let idx = 0;

export function detectLang() {
  const list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']).map((l) => String(l).toLowerCase());
  for (const l of list) {
    if (l.startsWith('uk')) return 'uk';
    if (l.startsWith('ru') || l.startsWith('be') || l.startsWith('kk')) return 'ru';
    if (l.startsWith('en')) return 'en';
  }
  return 'en';
}

export function setLang(pref) {
  const lang = pref && pref !== 'auto' ? pref : detectLang();
  idx = Math.max(0, LANGS.indexOf(lang));
  document.documentElement.lang = LANGS[idx];
  return LANGS[idx];
}

export function lang() {
  return LANGS[idx];
}

export function t(key, n) {
  const row = S[key];
  let s = row ? row[idx] || row[0] : key;
  if (n !== undefined) s = s.replace('{n}', n);
  return s;
}

export function locale() {
  const map = { en: 'en-US', ru: 'ru-RU', uk: 'uk-UA' };
  const nav = (navigator.language || '').toLowerCase();
  // keep the user's region for dates and money when the language matches
  if (nav.startsWith(LANGS[idx])) return navigator.language;
  return map[LANGS[idx]];
}

export function fmtDate(ms) {
  try {
    return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long' }).format(new Date(ms));
  } catch {
    return new Date(ms).toDateString();
  }
}

// Mock prices in the currency a store would show for the user's region.
const PRICES = {
  USD: { week: 2.99, year: 19.99, life: 29.99 },
  EUR: { week: 2.99, year: 19.99, life: 29.99 },
  GBP: { week: 2.49, year: 17.99, life: 24.99 },
  RUB: { week: 249, year: 1490, life: 2290 },
  UAH: { week: 99, year: 699, life: 999 },
};

export function currency() {
  const all = (navigator.languages || [navigator.language || 'en-US']).join(',').toUpperCase();
  if (/-UA\b|^UK\b|,UK\b/.test(all)) return 'UAH';
  if (/-RU\b|-BY\b|-KZ\b/.test(all)) return 'RUB';
  if (/-GB\b/.test(all)) return 'GBP';
  if (/-(DE|FR|ES|IT|NL|AT|BE|FI|IE|PT|SK|SI|EE|LV|LT|GR)\b/.test(all)) return 'EUR';
  if (lang() === 'uk') return 'UAH';
  if (lang() === 'ru') return 'RUB';
  return 'USD';
}

export function prices() {
  const cur = currency();
  const p = PRICES[cur];
  const whole = cur === 'RUB' || cur === 'UAH';
  const nf = new Intl.NumberFormat(locale(), { style: 'currency', currency: cur, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 });
  const fmt = (v) => nf.format(v);
  const save = Math.round((1 - p.year / (p.week * 52)) * 100);
  return { cur, raw: p, fmt, save, yearPerWeek: fmt(whole ? Math.round(p.year / 52) : Math.floor((p.year / 52) * 100) / 100) };
}
