/**
 * Service de génération de liens WhatsApp.
 *
 * Le lien wa.me embarque l'identifiant de clic dans le message pré-rempli.
 * C'est ce qui permet à l'établissement et à la plateforme de rattacher
 * la conversation entrante à un clic précis (§7 du cahier des charges).
 */

/**
 * Construit une URL wa.me avec message d'attribution pré-rempli.
 * @param {string} phone Numéro WhatsApp au format international sans "+" (ex: "237655000001")
 * @param {string} clickId Identifiant de clic à embarquer
 * @param {string} [establishmentName] Nom de l'établissement (optionnel, pour le message)
 * @returns {string} URL wa.me complète
 */
function buildWhatsappUrl(phone, clickId, establishmentName = 'la plateforme Douala Discovery') {
  const cleanPhone = String(phone).replace(/[^\d]/g, '');
  const message =
    `Bonjour ${establishmentName}, je viens de la plateforme Douala Discovery. ` +
    `Mon identifiant de clic est ${clickId}.`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

module.exports = {
  buildWhatsappUrl,
};
