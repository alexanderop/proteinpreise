---
title: So entstehen die Preise
description: Woher die Zahlen kommen, was gezählt wird und wo die Grenzen liegen.
---

# So entstehen die Preise

Einmal am Tag lädt ein Skript den öffentlichen Produktkatalog jedes Shops. Die meisten Shops laufen auf Shopify und veröffentlichen ihren Katalog unter `/products.json`. Dort lesen wir nur diese Datei. Rühl24 läuft auf Gambio und hat keine solche Datei. Dort lesen wir die Kategorie „Protein“ und von jeder verlinkten Produktseite die eingebetteten Produktdaten, die der Shop auch für Suchmaschinen bereitstellt. Kein Login, kein Warenkorb, keine Affiliate-Links.

Aus jedem Lauf entsteht ein Snapshot, eine JSON-Datei mit Datum. Die Snapshots liegen im Git-Repository. Der Preisverlauf ist nichts anderes als diese Dateien hintereinander gelesen.

## Welche Shops

::shop-list
::

## Was als Angebot zählt

Ein Angebot ist ein Produkt in einer Packungsgröße, zum Beispiel „Designer Whey, 908 g“ bei ESN. Gibt es dieselbe Größe in mehreren Geschmacksrichtungen, zeigen wir den günstigsten lieferbaren Geschmack und zählen die übrigen mit.

Wir behalten nur Proteinpulver. Riegel, Kaffee, Porridge, Pancake-Mix, Bundles, Probierboxen, Adventskalender und Bücher fliegen raus. Packungen unter 200 g gelten als Probe und fehlen ebenfalls.

Die Packungsgröße lesen wir aus dem Namen der Variante, dann aus dem Produktnamen („480g“, „2,5 kg“). Das Gewichtsfeld des Shops nehmen wir nur, wenn es zwischen 100 g und 5 kg liegt. Bei Rühl24 ist das die Füllmenge aus der Grundpreisangabe. Manche Shops tragen dort Unsinn ein, etwa 935000 g für eine 900-g-Dose. Peak meldet dort das Versandgewicht mit Dose. Bei Peak lesen wir die Größe deshalb aus der Produktadresse (`micellar-casein-900`) und lassen Produkte ohne diese Angabe weg. Ohne verlässliche Größe kein Angebot.

## Kategorien

Die Kategorie kommt aus dem Produktnamen. Die Regeln werden der Reihe nach geprüft, die erste passende gewinnt:

1. **Mehrkomponenten**: Mischungen aus Vegan und Whey, aus Whey und Ei, aus Ei und Soja, und 2K-Proteine.
2. **Vegan**: Vegan, Plant, Soja, Erbse, Reis, Hanf, Mandel, Kürbis.
3. **Casein**: Casein oder Kasein im Namen.
4. **Mehrkomponenten**: Komplex, Complex, 3K, Hybrid, Blend.
5. **Isolat**: Isolat, Iso Whey, Clear, Hydrolysat, Protein-Wasser.
6. **Whey**: Whey oder Molke.
7. Alles andere mit „Protein“ im Namen landet bei **Mehrkomponenten**.

## Was „geändert“ heißt

Eine Preisänderung ist ein Preis, der sich gegenüber dem letzten Snapshot unterscheidet, in dem es dieses Angebot gab. **Reduziert** heißt, der Shop zeigt selbst einen durchgestrichenen höheren Preis. Rühl24 streicht dort die eigene UVP durch. Rühl ist selbst der Hersteller, die UVP war also nie ein Verkaufspreis. Wir zählen das nicht als reduziert.

## Grenzen

- **€/kg Pulver ist nicht €/kg Protein.** Ein Isolat mit 90 % Eiweiß ist pro Gramm Protein oft günstiger als ein billigeres Konzentrat mit 70 %. Den Proteingehalt veröffentlichen die Kataloge nicht maschinenlesbar, deshalb fehlt er hier.
- Gutscheincodes, Staffelpreise und Versandkosten sehen wir nicht.
- Die Zuordnung zu Kategorien ist eine Heuristik über den Namen. Sie liegt manchmal daneben.
- Fällt ein Shop an einem Tag aus, fehlen seine Angebote für diesen Tag. Der Verlauf hat dann eine Lücke.
- Preise ändern sich im Laufe des Tages. Maßgeblich ist der Preis im Shop.
