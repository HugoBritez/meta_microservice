// ========== WEBHOOK PRINCIPAL ==========
export interface WhatsAppWebhook {
  object: 'whatsapp_business_account';
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string; // WHATSAPP_BUSINESS_ACCOUNT_ID
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: WhatsAppChangeValue;
  field: 'messages' | 'message_template_status_update' | 'account_update';
}

// ========== ESTRUCTURA DE MENSAJES ==========
export interface WhatsAppChangeValue {
  messaging_product: 'whatsapp';
  metadata: WhatsAppMetadata;
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
}

export interface WhatsAppMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

// ========== TIPOS DE MENSAJES ==========
export interface WhatsAppMessage {
  from: string;
  id: string; // wamid.xxx
  timestamp: string;
  type: WhatsAppMessageType;
  
  // Contenido según el tipo
  text?: WhatsAppTextContent;
  image?: WhatsAppMediaContent;
  audio?: WhatsAppMediaContent;
  document?: WhatsAppMediaContent;
  video?: WhatsAppMediaContent;
  sticker?: WhatsAppMediaContent;
  location?: WhatsAppLocationContent;
  contacts?: WhatsAppContactMessage[];
  interactive?: WhatsAppInteractiveContent;
  button?: WhatsAppButtonContent;
  reaction?: WhatsAppReactionContent;
  
  // Contexto (para respuestas)
  context?: WhatsAppContext;
  
  // Errores (mensajes no soportados)
  errors?: WhatsAppError[];
}

export type WhatsAppMessageType = 
  | 'text' 
  | 'image' 
  | 'audio' 
  | 'document' 
  | 'video'
  | 'sticker'
  | 'location' 
  | 'contacts'
  | 'interactive'
  | 'button'
  | 'reaction'
  | 'unknown'
  | 'unsupported';

// ========== CONTENIDO DE MENSAJES ==========
export interface WhatsAppTextContent {
  body: string;
}

export interface WhatsAppMediaContent {
  caption?: string;
  mime_type: string;
  sha256: string;
  id: string;
}

export interface WhatsAppLocationContent {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface WhatsAppInteractiveContent {
  type: 'list_reply' | 'button_reply';
  list_reply?: {
    id: string;
    title: string;
    description?: string;
  };
  button_reply?: {
    id: string;
    title: string;
  };
}

export interface WhatsAppButtonContent {
  text: string;
  payload: string;
}

export interface WhatsAppReactionContent {
  message_id: string;
  emoji: string;
}

export interface WhatsAppContext {
  from: string;
  id: string;
  referred_product?: {
    catalog_id: string;
    product_retailer_id: string;
  };
}

// ========== CONTACT MESSAGES ==========
export interface WhatsAppContactMessage {
  addresses?: WhatsAppContactAddress[];
  birthday?: string;
  emails?: WhatsAppContactEmail[];
  name: WhatsAppContactName;
  org?: WhatsAppContactOrg;
  phones?: WhatsAppContactPhone[];
  urls?: WhatsAppContactUrl[];
}

export interface WhatsAppContactAddress {
  city?: string;
  country?: string;
  country_code?: string;
  state?: string;
  street?: string;
  type: 'HOME' | 'WORK';
  zip?: string;
}

export interface WhatsAppContactEmail {
  email: string;
  type: 'HOME' | 'WORK';
}

export interface WhatsAppContactName {
  formatted_name: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  suffix?: string;
  prefix?: string;
}

export interface WhatsAppContactOrg {
  company?: string;
  department?: string;
  title?: string;
}

export interface WhatsAppContactPhone {
  phone: string;
  wa_id?: string;
  type: 'HOME' | 'WORK';
}

export interface WhatsAppContactUrl {
  url: string;
  type: 'HOME' | 'WORK';
}

// ========== STATUS DE MENSAJES ==========
export interface WhatsAppStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    expiration_timestamp?: string;
    origin: {
      type: string;
    };
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
  errors?: WhatsAppError[];
}

// ========== ERRORES ==========
export interface WhatsAppError {
  code: number;
  title: string;
  message?: string;
  details?: string;
  error_data?: {
    details: string;
  };
  href?: string;
}

// ========== PARA TU BASE DE DATOS ==========
export interface MessageDocument {
  messageId: string;
  chatId: string; // Generado a partir del from/to
  timestamp: Date;
  from: string;
  to?: string;
  type: WhatsAppMessageType;
  content: any; // Flexible para diferentes tipos
  rawWebhook: WhatsAppWebhook; // Backup completo
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatDocument {
  chatId: string;
  participants: string[];
  lastMessage: Date;
  lastMessageContent: string;
  unreadCount: number;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

// ========== PARA WEBSOCKETS ==========
export interface WebSocketMessage {
  type: 'new_message' | 'message_status' | 'chat_update';
  chatId: string;
  data: MessageDocument | WhatsAppStatus | any;
  timestamp: Date;
} 