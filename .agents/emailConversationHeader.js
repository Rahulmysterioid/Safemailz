/**
 * emailConversationHeader.js
 * 
 * Reference implementation module for Email Conversation Header & Privacy Masking.
 * 
 * Rules:
 *   1. Mask ONLY actual registered clients present in clientsList.
 *   2. If an email address is NOT in clientsList, show real email / identity (do NOT generate dummy IDs).
 *   3. When opening an email detail, the top header row (#readingThreadHeader) displays STRICTLY ONLY the Client ID for registered clients.
 * 
 * @module emailConversationHeader
 */

/**
 * Resolves a client identity into a masked display object if registered in clientsList.
 * 
 * @param {string} emailStr - Raw email address
 * @param {string} fallbackName - Fallback display name
 * @returns {Object} { name, clientId, tag, fullTag, isClient }
 */
function getClientMaskedIdentity(emailStr, fallbackName = '') {
    if (!emailStr) return { name: fallbackName || 'Unknown', clientId: '', tag: '', fullTag: '', isClient: false };

    const clean = String(emailStr).toLowerCase().trim();

    // 1. Check clientsList for exact email match
    const match = (typeof clientsList !== 'undefined' && Array.isArray(clientsList))
        ? clientsList.find(c => (c.email || '').toLowerCase().trim() === clean)
        : null;

    if (match) {
        const name = match.displayName || match.name || fallbackName || 'Client';
        let cId = match.clientId || '34427';
        let numId = cId.replace(/^.*Client-?/i, '').trim();
        if (!numId) numId = cId;
        const firstName = name.split(' ')[0];
        const tag = `${firstName}- Client - ${numId}`;
        return {
            name: name,
            clientId: cId,
            tag: tag,
            fullTag: `<${tag}>`,
            isClient: true
        };
    }

    // 2. Not in clientsList -> DO NOT generate dummy IDs! Return real email / details.
    const cleanName = (fallbackName && !fallbackName.includes('@'))
        ? fallbackName
        : (clean.includes('@') ? clean.split('@')[0] : emailStr);

    const displayTag = clean.includes('@') ? `<${emailStr}>` : emailStr;

    return {
        name: cleanName,
        clientId: '',
        tag: emailStr,
        fullTag: displayTag,
        isClient: false
    };
}

/**
 * Masks raw email addresses in body/quote text ONLY if they match a registered client in clientsList.
 */
function maskAllEmailsInText(text) {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (match, user, domain) => {
        const identity = getClientMaskedIdentity(match, user);
        if (identity.isClient) {
            return identity.fullTag;
        }
        return match; // Keep real email if not a registered client
    });
}

/**
 * Builds top thread header: STRICTLY ONLY Client ID when sender is a registered client.
 */
function buildThreadHeader(mail, clientsList) {
    const masked = getClientMaskedIdentity(mail.senderEmail || mail.sender, mail.sender);
    if (masked.isClient && masked.clientId) {
        return masked.clientId; // STRICTLY ONLY Client ID
    }
    return masked.name || mail.sender || 'Unknown';
}

module.exports = {
    getClientMaskedIdentity,
    maskAllEmailsInText,
    buildThreadHeader
};
