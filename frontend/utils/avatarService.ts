export const getFormalAvatar = (firstName: string, lastName: string, role?: string) => {
  // Générer les initiales à partir du prénom et nom
  const firstInitial = firstName?.charAt(0).toUpperCase() || '';
  const lastInitial = lastName?.charAt(0).toUpperCase() || '';
  const initials = `${firstInitial}${lastInitial}`;
  
  const baseUrl = 'https://api.dicebear.com/7.x/initials/svg';
  
  const params = new URLSearchParams({
    seed: initials || 'U',
    backgroundType: 'solid',
    fontWeight: '700',
    fontSize: '44',
    radius: '30'
  });

  // Personnalisation des couleurs selon le rôle
  if (role?.toLowerCase().includes('douane') || role?.toLowerCase().includes('customs')) {
    params.append('backgroundColor', '1e293b'); // Dark Slate pour Douane
  } else if (role?.toLowerCase().includes('banque')) {
    params.append('backgroundColor', '2563eb'); // Bleu pour Banque
  } else {
    params.append('backgroundColor', '64748b'); // Gris pro par défaut
  }

  return `${baseUrl}?${params.toString()}`;
};