# Veltron AI Lab — dokument za medije

Poslednja provera činjenica: 11. oktobar 2026. Sve tvrdnje u ovom dokumentu proverene su tog dana u produkciji i u kodu projekta.

Veltron AI Lab je eksperimentalni AI asistent za podršku korisnicima, integrisan u sajt veltroncars.com. Nalazi se na stranici https://veltroncars.com/ai-lab/, a kao mali razgovorni widget dostupan je i na osam javnih stranica sajta. Projekat je deo Veltron Cars-a, nezavisnog studija za dizajn i istraživanje automobila iz Beograda. Veltron trenutno nema proizvodni automobil i ne prodaje automobile — bavi se dizajnom i istraživanjem koncepta, kao što su V1 SportLine i istraživanje V-Force pogona. AI Lab je nastao kao logičan sledeći korak: sajt predstavlja kompaniju i njene ideje, a asistent pomaže posetiocima da brzo dođu do odgovora.

## Zašto sam ga napravio

Posetioci sajta stalno postavljaju ista pitanja: ko stoji iza kompanije, šta su dizajn pillar-i, u kom je statusu razvoj, da li postoji proizvodni automobil. Odgovori već postoje na sajtu, ali ih morate pronaći sami, čitanjem više stranica.

Hteo sam asistenta koji te odgovore daje odmah, u razgovoru, ali bez preterivanja. Ne bot koji izmišlja ili prodaje nešto što ne postoji. Zato je sistem napravljen tako da asistent radi ono što mu je dozvoljeno: odgovara iz konfiguracije koju sam ručno napisao, priznaje kada ne zna, preusmerava na čoveka kada treba i ne prelazi temu na ono što Veltron nije.

Drugi razlog je učenje. Želeo sam da prođem ceo tok jednog AI proizvoda — od integracije modela, preko bezbednosti, do testiranja — na nečemu što stvarno stoji javno na internetu.

## Kako funkcioniše

Sajt je statičan i hostovan je na GitHub Pages-u (https://veltroncars.com). Backend radi na Render-u (https://veltron-backend.onrender.com). Obe adrese su proverene 11.10.2026. i rade.

Vazno je odmah raščistiti najčešće nesporazume: ovo nije model koji sam trenirao niti sam napravio svoj jezički model. Backend poziva OpenRouter (openrouter.ai), servis koji omogućava pristup različitim postojećim modelima. Podrazumevana postavka je `openrouter/auto`, što znači da OpenRouter sam bira model koji odgovara. U praksi, u poslednjoj evaluaciji i u razgovorima preko widgeta 11.10.2026. prijavljen je `google/gemini-2.5-flash` kao model koji je stvarno odgovorio. To je snimak jednog trenutka — za svaki naredni zahtev ne mogu da garantujem koji će tačno model OpenRouter izabrati.

Ponašanje asistenta ne zavisi samo od modela, nego i od konfiguracije. Konfiguracija je JSON fajl (verzija 1.1.0) sa pet pravila (iskrenost, priznavanje neznanja, eskalacija na čoveka, opseg tema i odbrana od pokušaja da se uputstva promene), sedam primera dobrih odgovora, jedanaest ručno potvrđenih činjenica o kompaniji i listom poznatih ograničenja. Konfiguracija je javno dostupna na https://veltron-backend.onrender.com/api/ai-lab/config — smatram da treba da se vidi šta asistentu piše. Tamo nema tajnih podataka; API ključ nikada ne ide preko tog endpointa niti u browser.

Asistent ume i da na zahtev dohvati javno objavljene stranice sajta. Backend ima tool koji poziva samo unapred dozvoljenih deset putanja (početna, Vision, Concepts, V1 SportLine, proces, o nama, kontakt, Journal, pitch deck i V1 arhiva). Putanje se proveravaju server-ske strane: odbacuje se sve što nije na listi, nema upita, fragmenata ni pokušaja izlaska iz te liste. Svako dohvatanje stranice ima ograničenje od 8 sekundi, tekst se čisti od HTML-a i skripti pre nego što ode modelu, a rezultat se kešira pet minuta. Po jednom pitanju najviše se tri puta ide u ovaj alat; ako dohvatanje ne uspe, asistent po uputstvu kaže da nije mogao da pristupi stranici i odgovara samo iz potvrđenih činjenica. Widget isto šalje informaciju o trenutnoj stranici, pa asistent zna gde se nalazite.

## Šta je trenutno urađeno

Sve što sledi je već implementirano, testirano i u produkciji.

Chat widget (crveni balon u uglu) stoji na osam javnih stranica: početnoj, Vision, Concepts, V1 SportLine, procesu, Journal, O nama i Kontakt. Proverio sam svaku stranicu pojedinačno 11.10.2026. Na AI Lab stranici widget namerno ne stoji da se ne bi udvostručio puna verzija interfejsa. Istorija razgovora čuva se samo u sessionStorage-u browsera, do 20 poruka, i nestaje kad zatvorite tab.

API ključ za OpenRouter nalazi se samo kao promenljiva okruženja na serveru. Unos se proverava (dužina poruke, istorija, dozvoljeni formati), HTML se odbacuje, a greške se ne prosleđuju detaljno ka klijentu. Na chat endpointu (`POST /api/ai-lab/config` je samo za čitanje konfiguracije) postoji ograničenje od 10 zahteva po minutu po IP adresi; proverio sam uživo — jedanaesti zahtev dobija 429. Ograničenje je u memoriji servera, što znači da radi dok backend ima jednu instancu, ali se ne prenosi automatski na više instanci. Honeypot polje hvata botove koji ne umeju da vide skrivena polja, isto kao na kontakt formi. CORS radi po listi dozvoljenih domena (proizvodni sajt i lokalni razvoj), nepoznati domeni se odbijaju. API odgovori nose bezbednosne hedere (CSP, X-Frame-Options DENY, no-referrer, nosniff), sve potvrđeno u produkciji.

Playground na /ai-lab/ prikazuje konfiguraciju u celini, identitet modela (provajder OpenRouter, identifikator `openrouter/auto` kao podrazumevana vrednost), primere pitanja i eksperimentalnu značku sa rezultatom poslednje provere ponašanja.

Za kvalitet postoje dva nivoa. Prvi je baterija od 67 automatskih testova: 26 za API i bezbednost endpointa, 22 za interfejs i widget, 8 za sadržaj system prompta i konfiguracije i 11 za validaciju samog konfiguracionog fajla. Pokrivaju validaciju unosa, hedere, CORS, ograničenje zahteva, honeypot, odbijanje proizvoljnih modela, tool petlju za dohvatanje stranica, odbijanje nedozvoljenih putanja, keš, čišćenje HTML-a, kontekst stranice i provere da u klijentskom kodu nema innerHTML-a ni ključeva. Poziv prema modelu u testovima je simuliran, pa testovi ne zavise od spoljašnjeg servisa. Sva 67 testova su ponovo pokrenuta 11.10.2026. i sva su prošla.

Drugi nivo je odvojena eval skripta koja asistenta uživo prolazi kroz osam unapred definisanih ponašanja: priznavanje neznanja, odbijanje izmišljanja politika, tri pokušaja da se promene uputstva, preporuka za eskalaciju na čoveka, odgovor na srpskom i odgovor iz potvrđene činjenice. Poslednji rezultat je 8/8, zabeležen u noći između 10. i 11.10.2026. sa modelom `google/gemini-2.5-flash` i konfiguracijom v1.1.0.

Mora se biti iskaren oko ovoga: 67 testova i 8/8 prolaza ne znače da je sistem potpuno bezbedan niti da model nikada neće pogrešiti. Testovi pokrivaju ono što sam mogao da predvidim i proverim. Eval heuristike ocenjuju odgovore po unapred zadanim znakovima — to je orijentir za jedan prolaz, ne merilo istine i ne dokaz otpornosti na svaki mogući pokušaj zaobilaženja. Honeypot, CORS i ograničenje zahteva su osnovne zaštitne mere, ne potpuna bezbednosna zaštita.

## Šta još nije rešeno

Asistent nema pamćenje preko sesija — kad zatvorite tab, razgovor nestaje. Podrška za jezike zavisi od modela; na srpskom uglavnom radi, ali nije zagarantovana za svaki odgovor. Dohvatanje stranica vidi samo javno objavljeni statični sadržaj — ne vidi ništa iza prijave niti internu administraciju.

Ograničenje zahteva je u memoriji servera i ne skalira se na više instanci bez promene. Otpor pokušajima da se uputstva promene je delimičan: testovi prolaze, ali model može da zabrlja na kreativne napade. I model može da pogreši — konfiguracija i alati smanjuju šansu, ne eliminišu je.

Ne tvrdim da je ovo gotov proizvod spreman za naplatu. Trenutna verzija je lični eksperiment koji javno radi.

## Planovi za budućnost

Postoji ideja da se ovaj pristup jednog dana izdvoji kao sopstveni API, odvojen od trenutnog sajta. To je za sada plan, ne nešto što već postoji — napisan je kao pravac razmišljanja, ne kao najava dostupnog proizvoda.

Isti pravac ide i ka dostupnosti za male internet prodavnice. Mnogim malim prodavnicama treba jednostavan asistent koji odgovara na pitanja o proizvodima i dostavi, a nemaju resurse da sami grade i održavaju ovakav sistem. Kao smernicu za budući model cene razmišljam o iznosu od oko 1,98 evra mesečno — ali to je samo ideja, ne dostupna usluga i ne potvrđena cena. Nema korisnika, partnera niti prihoda, i ne želim da stvaram utisak da ih ima. Prvo treba rešiti skaliranje, podršku i pouzdanost, pa tek onda razmišljati o naplati. Takođe ne tvrdim da su drugi servisi skupi niti da je ovaj već dokazano jeftiniji — jednostavno, ovo je pokušaj da se napravi nešto malo i pristupačno.

## Šta želim da naučim i postignem

Kroz ovaj projekat učim kako se jedan jezički model pretvara u nešto što liči na proizvod: kako se piše konfiguracija koja drži odgovore unutar okvira, kako se štiti API ključ, kako se testira ponašanje umesto samo kod i gde su stvarne granice onoga što uputstva (prompting) mogu da garantuju.

Želim da od ovoga napravim nešto što stvarno koristi malim prodavnicama — jednostavno, jeftino i pouzdano. Ne preko noći i ne sa obećanjima koja ne mogu da potkrepim. Korak po korak, sa javno vidljivim napretkom, kao što je i ovaj sajt nastao.

Javno dostupno (sve provereno 11.10.2026.):
- AI Lab: https://veltroncars.com/ai-lab/
- Sajt Veltron Cars: https://veltroncars.com/
- Konfiguracija asistenta (javni JSON): https://veltron-backend.onrender.com/api/ai-lab/config
- Kôd sajta (javni repozitorijum): https://github.com/mrvlajnic/veltron
- Kôd backend-a (javni repozitorijum): https://github.com/mrvlajnic/veltron-backend

Kontakt za medije: Boris Vlajnić, office@veltroncars.com
