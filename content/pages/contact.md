---
title: Contact
description: Contacter Au centime près pour une question, une suggestion d'article ou signaler une erreur.
---
Une question, une idée d'article, une erreur à signaler ? Écrivez-moi avec ce formulaire, je lis tous les messages.

Je ne peux pas donner de conseil personnalisé sur votre situation, mais vos questions m'aident à choisir les prochains articles.

<form name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field" action="/merci/">
<input type="hidden" name="form-name" value="contact">
<p hidden><label>Ne pas remplir <input name="bot-field"></label></p>
<label for="nom">Votre prénom</label><input id="nom" name="nom" required>
<label for="email">Votre e-mail</label><input id="email" name="email" type="email" required>
<label for="message">Votre message</label><textarea id="message" name="message" rows="6" required></textarea>
<button type="submit">Envoyer</button>
</form>
