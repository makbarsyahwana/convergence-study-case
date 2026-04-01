import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any) {
    // Don't throw if no token or invalid token — just return null
    return user || null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Try to authenticate, but always allow the request through
    try {
      await super.canActivate(context);
    } catch {
      // Ignore auth errors — req.user will just be null
    }
    return true;
  }
}
