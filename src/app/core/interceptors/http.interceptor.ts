import { HttpInterceptorFn, HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, tap } from 'rxjs';
import { AuthService } from '@app/auth/services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  if (req.url.includes('/auth/login') || 
      req.url.includes('/auth/register') || 
      req.url.includes('/auth/refresh')) {
    return next(req);
  }

  const token = authService.getAccessToken();
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/refresh')) {
        return authService.refreshToken().pipe(
          switchMap(() => {
            const newToken = authService.getAccessToken();
            if (newToken) {
              req = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
            }
            return next(req);
          }),
          catchError(refreshError => {
            authService.logout().subscribe();
            return throwError(() => refreshError);
          })
        );
      }

      return throwError(() => error);
    })
  );
};

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An error occurred';

      if (error.error instanceof ErrorEvent) {
        errorMessage = `Error: ${error.error.message}`;
      } else {
        errorMessage = error.error?.message || error.error?.error || error.message;
      }

      console.error('HTTP Error:', {
        status: error.status,
        message: errorMessage,
        url: error.url
      });

      return throwError(() => ({
        status: error.status,
        message: errorMessage,
        error: error.error
      }));
    })
  );
};

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const started = Date.now();
  
  return next(req).pipe(
    tap({
      next: (event) => {
        if (event.type === HttpEventType.Response) {
          const elapsed = Date.now() - started;
          console.log(`${req.method} ${req.url} - ${event.status} (${elapsed}ms)`);
        }
      },
      error: (error: HttpErrorResponse) => {
        const elapsed = Date.now() - started;
        console.error(`${req.method} ${req.url} - ${error.status} (${elapsed}ms)`);
      }
    })
  );
};
