# Au centime près — fonctionnement automatique

- Site : https://aucentimepres.fr, hébergé sur GitHub Pages. Chaque modification de la branche « Principal » déclenche la mise en ligne (GitHub Actions, fichier .github/workflows/deploy.yml), et une reconstruction automatique a lieu chaque matin.
- Articles : `content/articles/<slug>.md` (front-matter title, description, date AAAA-MM-JJ, category, et updated si mis à jour).
- Catégories autorisées : budget, epargne, impots, aides, micro-entreprise, consommation.
- Plan éditorial et journal de publication : `content/plan.md`.
- Réglages (AdSense, Analytics) : `site.config.json` → champ `adsenseClient` (ex. "ca-pub-1234567890123456") ; le fichier ads.txt est généré tout seul.

## Charte de rédaction (obligatoire)
1. Français, vouvoiement, ton chaleureux et clair, phrases courtes. Public : particuliers et micro-entrepreneurs en France.
2. 1 000 à 1 600 mots. Intro de 2-3 phrases qui répond tout de suite à la question, puis des H2 (##), au moins un tableau, au moins un exemple chiffré dans un encadré « > [!exemple] ».
3. Chaque chiffre réglementaire (taux, plafond, barème, montant d'aide, date) est VÉRIFIÉ le jour même sur une source officielle (service-public.gouv.fr, impots.gouv.fr, caf.fr, urssaf.fr, economie.gouv.fr, banque-france.fr, legifrance.gouv.fr). Si un chiffre ne peut pas être confirmé : ne pas l'écrire, rester qualitatif et renvoyer vers la source.
4. Section finale « ## Sources » avec 2 à 5 liens réellement consultés.
5. 2 à 3 liens internes vers des articles déjà publiés (format /slug/).
6. Jamais de conseil d'investissement personnalisé, jamais de promesse de gain. Encadré « > [!attention] » pour les pièges.
7. Contenu original, jamais copié. Pas de bourrage de mots-clés. Titre ≤ 70 caractères si possible, description 140-160 caractères.
8. Ne jamais mentionner un nombre d'années d'expérience de l'autrice.
