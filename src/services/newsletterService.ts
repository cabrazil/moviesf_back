import { prismaBlog } from '../prisma';

interface SubscribeParams {
  email: string;
  ipAddress?: string;
  userAgent?: string;
  source?: string;
}

interface SubscribeResult {
  success: boolean;
  message: string;
  data?: {
    email: string;
    subscribedAt: Date;
  };
  error?: string;
}

/**
 * Valida formato de email usando regex robusto
 */
function isValidEmail(email: string): boolean {
  // Regex mais completo para validar emails
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Sanitiza email (lowercase, trim)
 */
function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class NewsletterService {
  /**
   * Inscreve um email na newsletter
   * Se o email já existe, retorna sucesso silencioso (evita erro desnecessário)
   */
  async subscribe(params: SubscribeParams): Promise<SubscribeResult> {
    try {
      // Validar email
      if (!params.email || typeof params.email !== 'string') {
        return {
          success: false,
          message: 'Email é obrigatório',
          error: 'EMAIL_REQUIRED'
        };
      }

      // Sanitizar email
      const sanitizedEmail = sanitizeEmail(params.email);

      // Validar formato
      if (!isValidEmail(sanitizedEmail)) {
        return {
          success: false,
          message: 'Email inválido',
          error: 'INVALID_EMAIL'
        };
      }

      // Verificar se já existe
      const existing = await prismaBlog.newsletterSubscription.findUnique({
        where: { email: sanitizedEmail }
      });

      // Se já existe e está ativo, retornar sucesso silencioso
      if (existing && existing.isActive) {
        return {
          success: true,
          message: 'Você já está inscrito em nossa newsletter!',
          data: {
            email: sanitizedEmail,
            subscribedAt: existing.subscribedAt
          }
        };
      }

      // Se existe mas está inativo, reativar
      if (existing && !existing.isActive) {
        const updated = await prismaBlog.newsletterSubscription.update({
          where: { email: sanitizedEmail },
          data: {
            isActive: true,
            subscribedAt: new Date(),
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            source: params.source,
            unsubscribedAt: null
          }
        });

        return {
          success: true,
          message: 'Inscrição reativada com sucesso!',
          data: {
            email: sanitizedEmail,
            subscribedAt: updated.subscribedAt
          }
        };
      }

      // Criar nova inscrição
      const subscription = await prismaBlog.newsletterSubscription.create({
        data: {
          email: sanitizedEmail,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          source: params.source || 'blog_home'
        }
      });

      return {
        success: true,
        message: 'Inscrição realizada com sucesso!',
        data: {
          email: sanitizedEmail,
          subscribedAt: subscription.subscribedAt
        }
      };

    } catch (error: any) {
      console.error('Erro ao inscrever email na newsletter:', error);

      // Tratar erro de constraint única (caso de race condition)
      if (error.code === 'P2002') {
        return {
          success: true,
          message: 'Inscrição realizada com sucesso!',
          error: 'DUPLICATE_IGNORED'
        };
      }

      return {
        success: false,
        message: 'Erro ao processar inscrição. Tente novamente mais tarde.',
        error: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Verifica se um email está inscrito
   */
  async isSubscribed(email: string): Promise<boolean> {
    try {
      const sanitizedEmail = sanitizeEmail(email);
      const subscription = await prismaBlog.newsletterSubscription.findUnique({
        where: { email: sanitizedEmail }
      });

      return subscription ? subscription.isActive : false;
    } catch (error) {
      console.error('Erro ao verificar inscrição:', error);
      return false;
    }
  }

  /**
   * Lista todos os assinantes ativos (para uso futuro/admin)
   */
  async getActiveSubscribers() {
    try {
      return await prismaBlog.newsletterSubscription.findMany({
        where: { isActive: true },
        orderBy: { subscribedAt: 'desc' },
        select: {
          email: true,
          subscribedAt: true,
          source: true
        }
      });
    } catch (error) {
      console.error('Erro ao listar assinantes:', error);
      throw error;
    }
  }
}

export default NewsletterService;

