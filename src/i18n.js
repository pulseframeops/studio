(function(){
 'use strict';
 const dict=new Map(Object.entries({
  'Ночное шоссе · Outrun':'Outrun Highway',
  'Скоростная аркада · 16-bit':'Speed Arcade · 16-bit',
  'Живой параллакс · CRT · реакция на бас · пиксельные площадки':'Parallax motion · CRT · Bass reactive · Pixel platform icons',
  'Лови звёзды':'Catch the stars',
  'Звёзды пролетают из верхних углов и исчезают на середине пути. Кликни по ним, пока они видны.':'Stars shoot in from the upper corners and disappear halfway. Click them while visible.',
  'Ночная глава':'Night chapter','Рассветная глава':'Sunrise chapter',
  '5 обычных + 2 золотые':'5 regular + 2 gold',
  '5 золотых + 5 бриллиантовых':'5 gold + 5 diamond',
  'Вероятность золотой звезды: 45%. Звуки можно отключить в системе.':'Gold drop chance: 45%. Sounds can be muted in system settings.',
  'НАЧАТЬ ИГРУ':'START GAME',
  'Заново':'Restart',
  'Поймай звёзды до середины их пути.':'Catch the stars before they reach the middle.',
  'Звездопад':'Starfall',

  'Настройки':'Settings',
  'Настройки / Settings':'Settings',
  'Тема / Theme':'Theme',
  'Ночная / Night':'Night',
  'Тёмная / Dark':'Dark',
  'Тёмная или ночная (глубокий чёрный)':'Dark or night (deep black)',
  'Настрой язык и отображение. Эти параметры не изменяют готовый клип и не затрагивают монтаж.':'Choose the language and theme. Neither affects the rendered video or your existing edits.',
  'Язык и тема сохраняются на этом устройстве и применяются к интерфейсу. Параметры проекта и экспорт остаются неизменными.':'Language and theme are saved on this device. Editing and export settings are unchanged.',
  'Показывать выбранные площадки':'Show selected platforms',
  'VK Музыка':'VK Music',
  'Яндекс Музыка':'Yandex Music',
  'Точка входа исходника, сек.':'Source in-point (sec.)',
  'Длительность перехода (0.1–1 сек.)':'Transition duration (0.1–1 sec.)',
  'Pull In: убрать визуализатор перед первой волной нарезок, вернуть со второго цикла':'Pull In: fade out visualizer before the first cut cycle and restore on the next pass',
  'ТРАНСФОРМАЦИЯ КАДРА':'FRAME TRANSFORM',
  'Сдвиг X (%)':'Move X (%)',
  'Сдвиг Y (%)':'Move Y (%)',
  'Масштаб (%)':'Scale (%)',
  'Поворот (°)':'Rotate (°)',
  'Непрозрачность (%)':'Opacity (%)',
  'Cut · обычная склейка':'Cut',
  'Pull In · быстрый зум внутрь':'Pull In · punch zoom',
  'Pull Out · резкий выход':'Pull Out · zoom out',
  'Shake · импульсная тряска':'Shake · hit',
  'Spin / Rotate · вращение':'Spin / Rotate',
  'Тяни клип для перемещения. Тяни левую/правую границу для обрезки; исходный таймкод тоже учитывается. Колесо с Shift прокручивает таймлайн. Пробел — просмотр, Ctrl+B — разрезать.':'Drag clips to move; drag edges to trim. Shift+wheel scrolls the timeline. Space plays, Ctrl+B splits.',
  'Фон и обложка занимают весь вертикальный кадр. Эдит-фон в анонсе отключён.':'Background and artwork fill the portrait frame. Edit footage is disabled for teasers.',
  "Частицы по цвету обложки":"Particles match cover art",
  "Плавная пауза движения при басе: 100–500 мс":"Smooth particle pause on bass: 100–500 ms",
  "Свечение названия интро (0–100%)":"Intro title glow (0–100%)",
  "Масштаб фонового изображения / эдита":"Background image / montage zoom",
  "Фон: сдвиг X":"Background: pan X",
  "Фон: сдвиг Y":"Background: pan Y",
  "Передача кадров":"Intermediate frame transfer",
  "Быстрее · JPEG 98% (почти без видимой разницы)":"Faster · JPEG 98% (minimal visual difference)",
  "Точная · PNG без потерь, медленнее":"Precise · lossless PNG, slower",
  "Directional Slide · движение по кадру":"Directional Slide",
  "Spin / Turn · разворот":"Spin / Turn",
  "Frame Echo · шлейф":"Frame Echo",
  "Velocity Punch · скорость/приближение":"Velocity Punch",
  "Chromatic Hit · RGB-контур":"Chromatic Hit · RGB edges",
  "Motion Echo · шлейф":"Motion Echo",
  "Invert Flash · негатив":"Invert Flash",
  "Pixel Punch · пикселизация":"Pixel Punch",
  'Новый':'New','Открыть':'Open','Сохранить':'Save','Экспорт MP4':'Export MP4',
  'Мастер':'Wizard','Редактор':'Editor','Монтаж':'Montage','Анонс':'Teaser','Справка':'Help',
  'НОВЫЙ КЛИП / МАСТЕР':'NEW CLIP / WIZARD','Музыка становится видимой.':'Turn music into visuals.',
  'Загрузи трек, выбери стиль и собери клип. Всё остаётся на твоём компьютере.':'Load your music, choose a style and create a video. Files stay on your computer.',
  'Музыка':'Music','Информация':'Metadata','Оформление':'Artwork','Сцены':'Scenes','Готово':'Finish',
  'ШАГ 01 / 05':'STEP 01 / 05','ШАГ 02 / 05':'STEP 02 / 05','ШАГ 03 / 05':'STEP 03 / 05','ШАГ 04 / 05':'STEP 04 / 05','ШАГ 05 / 05':'STEP 05 / 05',
  'Выбери музыку':'Choose music','Перетащи трек сюда или нажми для выбора':'Drop an audio file here or click to browse',
  'Продолжительность определится автоматически. Максимум для ранней версии: 2 часа.':'Duration is detected automatically. Current limit: 2 hours.',
  'Пока ничего не выбрано':'No file selected',
  'Анализ частот запускается после импорта. Он позволяет точно синхронизировать эффекты и экспорт.':'Audio analysis starts after import to synchronize the effects and export.',
  'Расскажи о треке':'Track information','Название трека':'Track title','Исполнитель':'Artist','Альбом':'Album','При участии':'Featuring','Жанр':'Genre','Год':'Year',
  'Создай атмосферу':'Choose the look','Обложка *':'Cover art *','Выбрать PNG, JPG или WebP':'Select PNG, JPG or WebP',
  'Свой фон':'Custom background','Необязательно, иначе фон из обложки':'Optional, otherwise the cover is used',
  'Стиль визуализации':'Visualization style','Neon Wave — волны и частицы':'Neon Wave — waves and particles',
  'Montagem — жёсткие удары и глитч':'Montagem — punchy beats and glitches',
  'Если фон не выбран, программа увеличит обложку, размоет и затемнит её.':'Without a background, the cover fills the canvas with blur and dimming.',
  'Настрой сцены':'Configure scenes','Длительность интро (сек.)':'Intro duration (sec.)','Спецэффект интро':'Intro accent','Глитч · 0,5 сек.':'Glitch · 0.5 sec.',
  'Звездопад':'Starfall','Когда начинается музыка?':'When does music begin?','С самого начала интро':'From the start of the intro','После завершения интро':'After the intro',
  'Появление плеера':'Player entrance','Аутро (сек.)':'Outro (sec.)','Формат видео':'Video aspect ratio',
  '16:9 — YouTube':'16:9 — YouTube','9:16 — Shorts / Reels':'9:16 — Shorts / Reels','Почти готово':'Almost ready','Открыть редактор →':'Open editor →',
  '← Назад':'← Back','Далее →':'Next →','СЦЕНЫ':'SCENES','Интро':'Intro','Заставка и название':'Opening and title',
  'Визуализатор':'Visualizer','Обложка, спектр, эффекты':'Cover, spectrum, effects','Аутро':'Outro',
  'Площадки и завершение':'Streaming platforms and finale','ПРЕСЕТЫ':'PRESETS',
  'Удары трека определяются автоматически. Можно добавить собственные акценты на таймлайне.':'Beats are detected automatically. You can add custom FX markers to the timeline.',
  'Предпросмотр':'Preview','Качество':'Quality','Твой первый визуализатор':'Your first visualizer','Загрузи трек и обложку в мастере':'Load music and artwork in the wizard',
  'К мастеру →':'Go to wizard →','НАСТРОЙКИ':'SETTINGS','Название':'Title','Отображение':'Layout','Положение обложки':'Cover position',
  'Слева':'Left','По центру':'Center','Справа':'Right','Пропорции':'Aspect ratio','Горизонтально 16:9':'Landscape 16:9','Вертикально 9:16':'Portrait 9:16',
  'Интро и аутро':'Intro and outro','Интро, сек.':'Intro, sec.','Надпись интро':'Intro text','Анимация интро':'Intro animation',
  'Глитч':'Glitch','Играет с начала':'Starts immediately','После интро':'After intro','Аутро, сек.':'Outro, sec.','Музыкальные площадки':'Music platforms',
  'Фон и площадки':'Background and platforms','Размытие фона':'Background blur','Затемнение':'Dimming','Виньетка':'Vignette',
  'Открыть Montage Editor':'Open Montage Editor','Аудиореактивные эффекты':'Audio-reactive effects',
  'Выбранный FX-маркер, сила':'Selected FX marker strength','Снизить резкие вспышки и тряску':'Reduce intense flashes and shake',
  'Водяные знаки и брендинг':'Watermarks and branding','Основной водяной знак':'Primary watermark',
  'Системный · PulseFrame (по умолчанию)':'Built-in · PulseFrame (default)','Свой PNG':'Custom PNG','Своё видео / анимированный знак':'Custom video / animated watermark',
  'Выключен':'Disabled','Выбрать PNG или видео':'Select PNG or video','Файл не выбран':'No file selected','Положение':'Position',
  'Левый нижний':'Bottom left','Правый нижний':'Bottom right','Левый верхний':'Top left','Правый верхний':'Top right',
  'Размер (%)':'Size (%)','Непрозрачность (%)':'Opacity (%)',
  'Надпись «Visual by PulseFrame» отображается отдельно справа сверху, поверх пользовательских слоёв. В открытых исходниках её можно изменить.':'The Visual by PulseFrame credit stays above custom overlays in the top-right corner. Open-source builds can be modified.',
  'ТАЙМЛАЙН':'TIMELINE','Нажми на дорожку, чтобы перемотать':'Click a lane to seek','＋ FX-маркер':'＋ FX marker','− Маркер':'− Marker',
  'Анонс сингла':'Single teaser','Выдели 10–30 секунд из песни. 15 секунд или больше рекомендуются, но не обязательны. Интро, визуал и аутро входят в выбранную длительность.':'Choose 10–30 seconds of music (15+ recommended). Intro, main scene and outro fit inside the selected duration.',
  '01 / ФРАГМЕНТ ПЕСНИ':'01 / AUDIO SEGMENT','Начало (сек.)':'Start (sec.)','Длина (10–30 сек.)':'Length (10–30 sec.)',
  'Рекомендуемая длина: от 15 секунд':'Recommended: at least 15 seconds','02 / ИНТРО':'02 / INTRO','Длительность интро (0–5 сек.)':'Intro duration (0–5 sec.)',
  'В анонсе отдельное интро: визуализация и звук плавно появляются из темноты, без титра исполнителя.':'The teaser uses a separate intro: visualization and audio fade in from black, without artist text.',
  '03 / АУТРО РЕЛИЗА':'03 / RELEASE OUTRO','Длительность аутро (2–6 сек.)':'Outro duration (2–6 sec.)','Дата выхода (необязательно)':'Release date (optional)',
  'Нет даты → «СКОРО НА ПЛОЩАДКАХ»':'No date → “COMING TO PLATFORMS”','04 / КАДРИРОВАНИЕ 9:16':'04 / 9:16 FRAMING',
  'Приближение фона / сцены':'Scene / background zoom','Сдвиг по горизонтали':'Horizontal offset','Сдвиг по вертикали':'Vertical offset',
  'Фон, обложка и эдит занимают весь вертикальный кадр. Приближение и смещения позволяют выбрать область внимания.':'The background, cover and montage fill the vertical frame. Zoom and offsets select the focus area.',
  'ПРЕДПРОСМОТР АНОНСА':'TEASER PREVIEW','Вертикальный кадр 9:16, не меняет формат основного клипа':'Vertical 9:16; does not affect the main video',
  'Загрузи музыку и обложку в мастере':'Load music and cover in the wizard','↤ Начало':'↤ Beginning',
  'Сцены: интро → основа → релиз':'Scenes: intro → main → release','Нажми на шкалу времени для перемотки. Маркеры FX применяются только к анонсу.':'Click the timeline to seek. FX markers affect the teaser only.',
  '05 / ЭФФЕКТЫ НА ОСНОВНОЙ СЦЕНЕ':'05 / MAIN SCENE EFFECTS',
  'Поставь курсор на нужный момент после интро и добавь акцент. Он затронет весь кадр, включая обложку.':'Place the playhead after the intro and add an accent affecting the entire frame.',
  'Тип эффекта':'Effect type','Flash · вспышка':'Flash','Zoom · приближение':'Zoom','Shake · удар':'Shake','Интенсивность':'Intensity',
  '＋ Добавить FX на курсоре':'＋ Add FX at playhead','Нет эффектов. Можно оставить пустым.':'No effects yet. Optional.',
  'Экспорт до 30 сек. · Видео 9:16 · MP4 H.264/AAC. Эффекты необязательны.':'Up to 30 seconds · 9:16 MP4 H.264/AAC · FX optional.',
  'Отдельный видеоредактор: собирай эдит, настрой переходы и просмотри исходные кадры без обложки и визуализатора.':'Dedicated edit workspace: arrange clips and transitions, preview footage without the music visualizer.',
  '← В редактор':'← Back to editor','МЕДИАБИБЛИОТЕКА':'MEDIA LIBRARY','＋ Добавить видео / фото':'＋ Add video / photo',
  'Максимум 2 основных видео и 20 нарезок':'Up to 2 main videos and 20 cuts',
  'Включить эдит-фон · зацикливать только нарезки':'Enable edit background · loop cuts only',
  'Оставить оригинальный звук двух основных видео (с микшированием)':'Keep original sound from 2 main videos (mixing)',
  'Переход ПЕРЕД клипом':'Transition BEFORE clip','Без перехода · Cut':'No transition · Cut','Плавная склейка · Fade':'Crossfade',
  'Шторка · Wipe':'Wipe','Эффект клипа':'Clip effect','Без эффекта':'No effect','Начало вставки (сек.)':'Clip start (sec.)',
  'Длина клипа (сек.)':'Clip duration (sec.)','Музыкальный фрагмент (начало, сек.)':'Music trim start (sec.)',
  'Музыкальный фрагмент (конец, сек.; 0 = до конца)':'Music trim end (sec.; 0 = end)',
  'ПРЕДПРОСМОТР ЭДИТА':'MONTAGE PREVIEW','Без обложки, логотипов и затемнения финального ролика':'Without cover, logos or final video dimming',
  'Только нарезки повторяются на протяжении основной сцены':'Only the cuts loop through the main scene',
  'Масштаб таймлайна':'Timeline zoom','МОНТАЖНЫЙ ТАЙМЛАЙН':'MONTAGE TIMELINE','Ctrl+B · Разрезать':'Ctrl+B · Split',
  'C · Копировать':'C · Copy','V · Вставить':'V · Paste','Удалить':'Delete','ВРЕМЯ':'TIME','ОСНОВА':'MAIN VIDEOS','НАРЕЗКИ':'CUTS','ПЕРЕХОДЫ':'TRANSITIONS','ПОВТОР':'LOOP',
  'Добавь видео или фото слева':'Add videos or photos on the left','Декоративная картинка в углу':'Decorative corner image','＋ Добавить PNG / JPG':'＋ Add PNG / JPG',
  'Экспорт в MP4':'Export to MP4','Покадровый рендер H.264 + AAC. Для этой функции требуется Electron и установленный FFmpeg.':'Frame-by-frame H.264/AAC export requires Electron and FFmpeg.',
  'Ориентация':'Orientation','Разрешение':'Resolution','Частота кадров':'Frame rate','Сбалансированное':'Balanced','Быстрое':'Fast','Высокое':'High',
  'FFmpeg (в том числе portable)':'FFmpeg (including portable)','Автопоиск в PATH':'Auto-detect from PATH','Указать ffmpeg.exe':'Browse for ffmpeg.exe',
  'Проверка готовности…':'Checking readiness…','Отмена':'Cancel','Начать экспорт':'Start export',
  'Документация PulseFrame Studio':'PulseFrame Studio documentation','Как пользоваться':'User guide','Авторские права':'Copyright','Лицензии':'Licenses',
  'Соцсети':'Social media','Быстрый старт':'Quick start','Анонс для TikTok / Shorts':'TikTok / Shorts teaser','Горячие клавиши':'Keyboard shortcuts',
  'Ограничения':'Limitations','Твои материалы и разрешения':'Your media and permissions','Лицензии компонентов':'Component licenses',
  'PulseFrame Studio в соцсетях':'PulseFrame Studio online','Новости проекта, обновления и исходный код:':'News, updates and source code:',
  'Ссылки открываются во внешнем браузере. Для просмотра документации интернет не требуется.':'Links open in your browser. Documentation is available offline.',
  'Закрыть справку':'Close help','Пробел':'Space','копировать клип ·':'copy clip ·','вставить клип ·':'paste clip ·',
  'сохранить ·':'save ·','отменить ·':'undo ·','нарезка в монтаже ·':'split clip ·'
 }));
 const helpTranslations={"В мастере загрузи музыку, укажи исполнителя и название, добавь обложку.": "In the wizard, import your music, enter the artist and track title, and add cover artwork.", "Фон можно оставить пустым: в этом случае размытой основой станет обложка. Доступны стили Neon и Montagem.": "The background is optional: PulseFrame will blur the cover automatically. Choose Neon or Montagem.", "Настрой интро, аутро и площадки в основном редакторе.": "Configure intro, outro and streaming platforms in the main editor.", "Для Montagem открой вкладку «Монтаж», включи эдит-фон и добавь видео/фото: до двух основных и двадцати нарезок.": "For Montagem, open the Montage tab, enable the edit background, and add up to two main videos and 20 cuts.", "На монтажном таймлайне выбери клип, настрой эффект и переход перед ним. Главные видео проигрываются один раз, повторяются только нарезки до окончания основной сцены. При поиске кадров видеодекодером предпросмотр удерживает последний готовый кадр вместо чёрной вспышки. Превью монтажа показывает только исходный эдит.": "In the montage timeline, select a clip, assign its effect and transition. Main clips play only once; cuts loop until the music scene ends. The preview displays raw edit footage, and holds the last decoded frame on seeks.", "Сохрани проект и нажми «Экспорт MP4». В десктопной программе можно указать путь к portable FFmpeg (например,": "Save the project and select Export MP4. In the desktop app you can choose a portable FFmpeg executable, for example", "Открой вкладку «Анонс». Выбери музыкальный фрагмент от 10 до 30 секунд (рекомендуется от 15 секунд), настрой короткое интро, аутро с датой релиза или надписью «СКОРО». Выбирай моменты основной сцены на шкале времени и по желанию добавляй FX. Интро и аутро входят в ограничение по длине. Экспорт анонса всегда вертикальный 9:16 и не меняет формат полного проекта.": "Open the Teaser tab. Select 10–30 seconds of a track (15+ recommended). Its intro fades the video and music in; the main scene can carry effects, and the outro fades to a release announcement. If no date is chosen, it says COMING TO PLATFORMS. Intro and outro fit inside the selected duration. Teasers always export vertically without changing the full video settings.", "покадровая перемотка. В текстовых полях C и V не перехватываются.": "frame-by-frame seeking. C/V shortcuts are ignored while typing.", "HTML-предпросмотр не экспортирует MP4. Для экспорта нужна десктопная сборка и FFmpeg. Файл проекта ссылается на внешние медиафайлы: не перемещай исходники до завершения работы. Некоторые видеокодеки могут потребовать предварительного преобразования.": "The browser preview does not export MP4. Use the Electron desktop build and FFmpeg. Project files refer to external media by path, so keep your source files available. Some video codecs might require conversion.", "Музыка, видеоклипы, фотографии и обложки принадлежат их правообладателям. PulseFrame Studio не передаёт тебе права на чужие материалы. Для публикации клипа используй контент, на который у тебя есть необходимые права или разрешения.": "Music, video clips, images and cover artwork belong to their respective rights holders. PulseFrame does not grant rights to third-party material. Publish only material you have permission to use.", "Названия и логотипы Spotify, YouTube Music и Apple Music принадлежат соответствующим владельцам; их отображение не означает партнёрства или поддержки со стороны этих компаний. Использование логотипов должно соответствовать правилам владельцев брендов.": "Spotify, YouTube Music and Apple Music logos and names are trademarks of their respective owners; their presence does not imply endorsement or affiliation. Follow the brand usage guidelines.", "Программа работает с локальными файлами. Встраивать в экспорт сторонние логотипы и медиаматериалы следует только при наличии соответствующих прав.": "The app works with local files. You are responsible for ensuring appropriate rights to all third-party media and brand assets included in exports.", "исходный код проекта предоставлен по лицензии MIT; полный текст находится в файле": "The project source code is licensed under MIT; read the root LICENSE file. This does not license user-imported media or third-party trademarks.", "в корне сборки. Эта лицензия не распространяется на загруженные пользователем медиа или сторонние товарные знаки.": "in the project root.", "шрифт доступен через": "The font is available from", "и распространяется по SIL Open Font License (OFL). В этой сборке файлы шрифта отдельно не упакованы.": "and is distributed under the SIL Open Font License (OFL). The font files are not bundled in this build.", "используется как внешний инструмент. Условия лицензии конкретной сборки зависят от её компонентов и настроек; смотри": "is an external utility. License conditions vary by build; consult", ". Не считай все сборки FFmpeg одинаковыми по лицензии.": ". Different FFmpeg builds may have different licensing conditions.", "сторонняя программная зависимость с собственной лицензией. Подробности смотри в пакете Electron и его официальной документации.": "is a third-party dependency under its own license; see the Electron package and official documentation.", "Приложение поставляется «как есть», без гарантий. Перед распространением установщика проверь условия лицензий всех включённых компонентов.": "This application is provided as-is without warranty. Check all third-party license conditions before distribution."};
 for(const [ru,en] of Object.entries(helpTranslations))dict.set(ru,en);
 const originals=new WeakMap();const attrOriginals=new WeakMap();
 let lang='ru',busy=false,observer=null;
 function translateNode(node){
   if(!node||node.nodeType!==3)return;
   const text=node.nodeValue||'',trim=text.trim();if(!trim)return;
   const cached=originals.get(node),source=cached&&text.trim()===dict.get(cached)?cached:trim;
   if(source!==cached)originals.set(node,source);
   const translated=lang==='en'?(dict.get(source)||source):source;
   if(trim!==translated)node.nodeValue=text.replace(trim,translated);
 }
 function update(){
   if(busy)return;busy=true;
   try{
     const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
     let node;while(node=walker.nextNode())if(!node.parentElement?.closest('script,style,textarea,code'))translateNode(node);
     document.querySelectorAll('input[placeholder],textarea[placeholder],button[title]').forEach(el=>{
       const attr=el.hasAttribute('placeholder')?'placeholder':'title';let rec=attrOriginals.get(el);
       const cur=el.getAttribute(attr)||'';
       if(!rec||(!Object.values(rec).includes(cur)&&cur!==dict.get(rec.original)))rec={original:cur};
       attrOriginals.set(el,rec);const replacement=lang==='en'?(dict.get(rec.original)||rec.original):rec.original;
       if(cur!==replacement)el.setAttribute(attr,replacement);
     });
   }finally{busy=false;}
 }
 let scheduled=false;
 function schedule(){if(!scheduled){scheduled=true;queueMicrotask(()=>{scheduled=false;update();});}}
 function setLanguage(l){lang=l==='en'?'en':'ru';try{localStorage.setItem('pf-language',lang);}catch{}document.documentElement.lang=lang;document.dispatchEvent(new CustomEvent('pf-language-change',{detail:{language:lang}}));schedule();}
 function getLanguage(){try{return localStorage.getItem('pf-language')==='en'?'en':'ru';}catch{return 'ru';}}
 function init(){observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true,characterData:true});setLanguage(getLanguage());}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.PFI18n={setLanguage,getLanguage,t:(str)=>lang==='en'?(dict.get(str)||str):str};
})();
