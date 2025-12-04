/**
 * Translation Dictionaries
 * 
 * Contains all translatable strings for the application
 */

import { Locale } from './config';

export type TranslationKey = keyof typeof translations.en;

export const translations = {
  en: {
    // Common
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.submit': 'Submit',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.continue': 'Continue',
    'common.skip': 'Skip',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.disputes': 'Disputes',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    'nav.help': 'Help',
    'nav.logout': 'Log Out',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.creditScore': 'Credit Score',
    'dashboard.activeDisputes': 'Active Disputes',
    'dashboard.scoreChange': 'Score Change',
    'dashboard.quickActions': 'Quick Actions',
    
    // Disputes
    'disputes.title': 'Disputes',
    'disputes.new': 'New Dispute',
    'disputes.status.pending': 'Pending',
    'disputes.status.submitted': 'Submitted',
    'disputes.status.inReview': 'In Review',
    'disputes.status.resolved': 'Resolved',
    'disputes.status.rejected': 'Rejected',
    
    // Settings
    'settings.title': 'Settings',
    'settings.profile': 'Profile',
    'settings.notifications': 'Notifications',
    'settings.privacy': 'Privacy',
    'settings.billing': 'Billing',
    
    // Auth
    'auth.login': 'Log In',
    'auth.signup': 'Sign Up',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.email': 'Email',
    'auth.password': 'Password',
    
    // Onboarding
    'onboarding.welcome': 'Welcome to CreditMaster Pro',
    'onboarding.step1': 'Create Your Profile',
    'onboarding.step2': 'Set Your Goals',
    'onboarding.step3': 'Connect Accounts',
    'onboarding.step4': 'Complete Setup',
    
    // Errors
    'error.notFound': 'Page not found',
    'error.unauthorized': 'Unauthorized access',
    'error.serverError': 'Server error',
    'error.networkError': 'Network error',
    'error.tryAgain': 'Please try again'
  },
  
  es: {
    'common.loading': 'Cargando...',
    'common.error': 'Ocurrió un error',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.submit': 'Enviar',
    'common.back': 'Atrás',
    'common.next': 'Siguiente',
    'common.continue': 'Continuar',
    'common.skip': 'Omitir',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.sort': 'Ordenar',
    'nav.dashboard': 'Panel',
    'nav.disputes': 'Disputas',
    'nav.reports': 'Informes',
    'nav.settings': 'Configuración',
    'nav.help': 'Ayuda',
    'nav.logout': 'Cerrar Sesión',
    'dashboard.title': 'Panel',
    'dashboard.creditScore': 'Puntaje de Crédito',
    'dashboard.activeDisputes': 'Disputas Activas',
    'dashboard.scoreChange': 'Cambio de Puntaje',
    'dashboard.quickActions': 'Acciones Rápidas',
    'disputes.title': 'Disputas',
    'disputes.new': 'Nueva Disputa',
    'disputes.status.pending': 'Pendiente',
    'disputes.status.submitted': 'Enviada',
    'disputes.status.inReview': 'En Revisión',
    'disputes.status.resolved': 'Resuelta',
    'disputes.status.rejected': 'Rechazada',
    'settings.title': 'Configuración',
    'settings.profile': 'Perfil',
    'settings.notifications': 'Notificaciones',
    'settings.privacy': 'Privacidad',
    'settings.billing': 'Facturación',
    'auth.login': 'Iniciar Sesión',
    'auth.signup': 'Registrarse',
    'auth.forgotPassword': '¿Olvidaste tu contraseña?',
    'auth.email': 'Correo electrónico',
    'auth.password': 'Contraseña',
    'onboarding.welcome': 'Bienvenido a CreditMaster Pro',
    'onboarding.step1': 'Crea Tu Perfil',
    'onboarding.step2': 'Define Tus Metas',
    'onboarding.step3': 'Conecta Cuentas',
    'onboarding.step4': 'Completa la Configuración',
    'error.notFound': 'Página no encontrada',
    'error.unauthorized': 'Acceso no autorizado',
    'error.serverError': 'Error del servidor',
    'error.networkError': 'Error de red',
    'error.tryAgain': 'Por favor intenta de nuevo'
  },
  
  fr: {
    'common.loading': 'Chargement...',
    'common.error': 'Une erreur est survenue',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.submit': 'Soumettre',
    'common.back': 'Retour',
    'common.next': 'Suivant',
    'common.continue': 'Continuer',
    'common.skip': 'Passer',
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',
    'common.sort': 'Trier',
    'nav.dashboard': 'Tableau de bord',
    'nav.disputes': 'Litiges',
    'nav.reports': 'Rapports',
    'nav.settings': 'Paramètres',
    'nav.help': 'Aide',
    'nav.logout': 'Déconnexion',
    'dashboard.title': 'Tableau de bord',
    'dashboard.creditScore': 'Score de Crédit',
    'dashboard.activeDisputes': 'Litiges Actifs',
    'dashboard.scoreChange': 'Évolution du Score',
    'dashboard.quickActions': 'Actions Rapides',
    'disputes.title': 'Litiges',
    'disputes.new': 'Nouveau Litige',
    'disputes.status.pending': 'En attente',
    'disputes.status.submitted': 'Soumis',
    'disputes.status.inReview': 'En cours',
    'disputes.status.resolved': 'Résolu',
    'disputes.status.rejected': 'Rejeté',
    'settings.title': 'Paramètres',
    'settings.profile': 'Profil',
    'settings.notifications': 'Notifications',
    'settings.privacy': 'Confidentialité',
    'settings.billing': 'Facturation',
    'auth.login': 'Connexion',
    'auth.signup': 'Inscription',
    'auth.forgotPassword': 'Mot de passe oublié?',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'onboarding.welcome': 'Bienvenue sur CreditMaster Pro',
    'onboarding.step1': 'Créez Votre Profil',
    'onboarding.step2': 'Définissez Vos Objectifs',
    'onboarding.step3': 'Connectez Vos Comptes',
    'onboarding.step4': 'Terminez la Configuration',
    'error.notFound': 'Page non trouvée',
    'error.unauthorized': 'Accès non autorisé',
    'error.serverError': 'Erreur serveur',
    'error.networkError': 'Erreur réseau',
    'error.tryAgain': 'Veuillez réessayer'
  }
} as const;

// Type for translation dictionaries
type TranslationDict = Record<string, string>;

// Add placeholder translations for other locales
export const allTranslations: Record<string, TranslationDict> = {
  en: translations.en as TranslationDict,
  es: translations.es as TranslationDict,
  fr: translations.fr as TranslationDict,
  de: translations.en as TranslationDict,
  pt: translations.en as TranslationDict,
  zh: translations.en as TranslationDict
};

