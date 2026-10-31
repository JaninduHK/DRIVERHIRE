# Translation glossary

Every translation of the public site uses these terms, so the same English word
always becomes the same word in each language. Update this table first when a
term changes, then the message files.

How the text is organised: `messages/<locale>/<page>.json`, one file per page,
same keys in every language. `npm run check:i18n` (also run before every build)
fails if a language is missing a line, a placeholder like `{name}`, a tag like
`<b>…</b>`, a list item or a plural form.

## Tone

| Language | Address | Notes |
|---|---|---|
| German | **Sie** (formal) | Nouns capitalised; "Guide" is used as a German word. |
| French | **vous** | Space before `: ; ? !` is not used on screen labels to avoid line breaks; quotes « ». |
| Italian | **tu** (informal) | The usual tone of Italian travel sites. |
| Russian | **вы** (lowercase) | Plural forms one / few / many. |
| Japanese | です・ます | No spaces between words; prices and numbers stay in Western digits. |

## Never translated

Car with Driver LK, carwithdriver.lk, CarWithDriver.lk, SLTDA, Sri Lanka Tourism
Development Authority (kept in English, may be followed by a translation in
brackets), USD prices such as `$50`, phone numbers, email addresses, vehicle
models, driver names, place names in Latin-script languages.

## Terms

| English | German | French | Italian | Russian | Japanese |
|---|---|---|---|---|---|
| driver | Fahrer | chauffeur | autista | водитель | ドライバー |
| car with driver | Auto mit Fahrer | voiture avec chauffeur | auto con autista | автомобиль с водителем | ドライバー付きの車 |
| Tourist Driver (licence) | Touristenfahrer | Chauffeur touristique | Autista turistico | Туристический водитель | ツーリストドライバー |
| Chauffeur Guide (Lecturer) (licence) | Chauffeur-Guide | Chauffeur-guide | Autista-guida | Шофёр-гид | ショーファーガイド |
| National Guide (Lecturer) (licence) | Nationaler Guide | Guide national | Guida nazionale | Национальный гид | ナショナルガイド |
| quote / quotation | Angebot | devis | preventivo | предложение | 見積もり |
| offer (a driver's priced reply) | Angebot | offre | offerta | предложение | 見積もり |
| quote request | Anfrage | demande de devis | richiesta di preventivo | запрос | 見積もり依頼 |
| booking | Buchung | réservation | prenotazione | бронирование | 予約 |
| traveller | Reisende(r) | voyageur | viaggiatore | путешественник | 旅行者 |
| daily rate | Tagespreis | tarif journalier | tariffa giornaliera | цена за день | 1日あたりの料金 |
| itinerary | Reiseroute | itinéraire | itinerario | маршрут | 旅程 |
| pick-up / drop-off | Abholort / Zielort | prise en charge / dépose | partenza / arrivo | место посадки / место высадки | 乗車地 / 降車地 |
| no booking fee | keine Buchungsgebühr | aucuns frais de réservation | nessun costo di prenotazione | без комиссии за бронирование | 予約手数料なし |
| island-wide | inselweit | dans toute l'île | in tutta l'isola | по всему острову | 島内全域 |
| review | Bewertung | avis | recensione | отзыв | レビュー |
| vehicle | Fahrzeug | véhicule | veicolo | автомобиль | 車両 |
| chat / message | Chat / Nachricht | chat / message | chat / messaggio | чат / сообщение | チャット / メッセージ |
| meet & greet at the airport | Empfang am Flughafen | accueil à l'aéroport | accoglienza in aeroporto | встреча в аэропорту | 空港でのお出迎え |
| verified | verifiziert | vérifié | verificato | проверенный | 認証済み |
| per day | pro Tag | par jour | al giorno | в день | 1日あたり |

Licence names: on badges and filters the short names above are used. Where a
page explains the licences, the official English title follows once in
brackets, e.g. „Chauffeur-Guide (offiziell: Chauffeur Guide Lecturer)".
