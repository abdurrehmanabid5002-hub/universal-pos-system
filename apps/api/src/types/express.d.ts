import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { TenantContext } from '../common/decorators/current-tenant.decorator';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      tenant?: TenantContext;
    }
  }
}
