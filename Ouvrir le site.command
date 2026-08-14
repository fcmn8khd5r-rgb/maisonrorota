#!/bin/bash
# Double-cliquez sur ce fichier pour ouvrir le site.
# Il démarre un petit serveur local puis ouvre votre navigateur.
# Pour tout arrêter : fermez cette fenêtre Terminal (ou Ctrl-C).

cd "$(dirname "$0")" || exit 1
PORT=8137

# si le port est déjà pris, on en essaie d'autres
while lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

echo "Maison Rorota"
echo "Site servi sur http://localhost:$PORT"
echo "Laissez cette fenêtre ouverte pendant la consultation."
echo

python3 -m http.server $PORT >/dev/null 2>&1 &
SERVEUR=$!
trap 'kill $SERVEUR 2>/dev/null' EXIT

sleep 1
open "http://localhost:$PORT/index.html"

wait $SERVEUR
