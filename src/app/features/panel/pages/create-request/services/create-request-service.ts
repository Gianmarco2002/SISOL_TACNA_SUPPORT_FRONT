import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, first, map, Observable, of, Subject, takeUntil } from 'rxjs';
import { FormCreateRequest } from '../model/create-request.model';
import { ErrorResponse } from '../../../../../core/models/error.model';
import { StateTicketService } from '../../../../../core/services/state-ticket-service';
import { CurrentUserService } from '../../../../../core/services/current-user-service';
import { createTechnicalSupportRequestAdapter } from '../adapters/form-to-create-technical.adapter';
import { ApiResult } from '../../../../../core/models/apiResult.model';
import { AuthResponse } from '../../../../auth/model/auth.model';
import { TechnicalSupportRequest } from '../../../../../core/models/technical-support-request';
import { VoucherActionTypeService } from '../../../../../core/services/voucher-action-type';
import { RequestTypeService } from '../../../../../core/services/request-type-service';
import { createVoucherRequestAdapter } from '../adapters/form-to-voucher-request.adapter';
import { VoucherRequest } from '../../../../../core/models/voucher-request.model';
import { createCreateUserRequestAdapter } from '../adapters/form-to-create-user-request.adapter';
import { CreateUserRequest } from '../../../../../core/models/createUserRequest.model';
import { createTicketReassignRequestAdapter } from '../adapters/form-to-ticket-reassign.adapter';
import { CreateTicketReassignRequest } from '../model/create-request.model';
import { environment } from '../../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CreateRequestService {
  private readonly baseUrl = `${environment.apiUrl}`;
  private http = inject(HttpClient);
  readonly loading = signal(false);
  private onDestroy = new Subject<void>();
  private stateTicketService = inject(StateTicketService);
  statesTicket = computed(() => this.stateTicketService.getAll());
  private currentUserService = inject(CurrentUserService);
  private voucherActionTypeService = inject(VoucherActionTypeService);
  private requestTypeService = inject(RequestTypeService);

  createTechnicalSupportRequest(
    data: FormCreateRequest,
  ): Observable<ApiResult<TechnicalSupportRequest, ErrorResponse>> {
    this.onDestroy.next();
    this.loading.set(true);

    const stateOpen = this.stateTicketService.getAll().find((s) => s.code === 'open')?.id ?? 0;

    const currentUserId = this.currentUserService.user()?.id ?? 0;

    const body = createTechnicalSupportRequestAdapter(data, currentUserId, stateOpen);

    return this.http
      .post<TechnicalSupportRequest>(`${this.baseUrl}/technical-support-request`, body)
      .pipe(
        takeUntil(this.onDestroy),
        first(),
        map((response: TechnicalSupportRequest) => ({
          data: response,
          error: null,
        })),
        catchError((error: HttpErrorResponse) =>
          of({
            data: null,
            error: error.error as ErrorResponse,
          }),
        ),
        finalize(() => this.loading.set(false)),
      );
  }

  createVoucherRequest(
    data: FormCreateRequest,
  ): Observable<ApiResult<VoucherRequest, ErrorResponse>> {
    this.onDestroy.next();
    this.loading.set(true);

    const stateOpen = this.stateTicketService.getAll().find((s) => s.code === 'open')?.id ?? 0;
    const currentUserId = this.currentUserService.user()?.id ?? 0;
    const currentRequestTypeCode = this.requestTypeService.getById(data.requestTypeId ?? 0)?.code;
    const voucherActionTypeId =
      this.voucherActionTypeService
        .getAll()
        .find((s) => s.code === this.getVoucherActionTypeCode(currentRequestTypeCode ?? ''))?.id ??
      0;

    const body = createVoucherRequestAdapter(data, currentUserId, stateOpen, voucherActionTypeId);

    // ✅ Construir FormData aquí antes de enviar
    const formData = new FormData();
    formData.append('state_id', String(body.state_id));
    formData.append('user_id', String(body.user_id));
    formData.append('voucher_action_type_id', String(body.voucher_action_type_id));
    formData.append('voucher_code', body.voucher_code);
    formData.append('speciality', body.speciality ?? '');

    if (body.request_type_id !== null)
      formData.append('request_type_id', String(body.request_type_id));

    if (body.priority_id !== null) formData.append('priority_id', String(body.priority_id));

    if (body.motive !== null && body.motive !== undefined) formData.append('motive', body.motive);

    if (body.attachment instanceof File)
      formData.append('attachment', body.attachment, body.attachment.name);

    return this.http.post<VoucherRequest>(`${this.baseUrl}/voucher-request`, formData).pipe(
      takeUntil(this.onDestroy),
      first(),
      map((response: VoucherRequest) => ({ data: response, error: null })),
      catchError((error: HttpErrorResponse) =>
        of({ data: null, error: error.error as ErrorResponse }),
      ),
      finalize(() => this.loading.set(false)),
    );
  }

  getAttachment(voucherId: number): Observable<ApiResult<{ url: string }, ErrorResponse>> {
    this.onDestroy.next();
    this.loading.set(true);
    return this.http
      .get<{ url: string }>(`${this.baseUrl}/voucher-request/${voucherId}/attachment`)
      .pipe(
        takeUntil(this.onDestroy),
        first(),
        map((r) => ({ data: r, error: null })),
        catchError((error: HttpErrorResponse) =>
          of({ data: null, error: error.error as ErrorResponse }),
        ),
        finalize(() => this.loading.set(false)),
      );
  }

  createCreateUserRequest(
    data: FormCreateRequest,
  ): Observable<ApiResult<CreateUserRequest, ErrorResponse>> {
    this.onDestroy.next();
    this.loading.set(true);

    const stateOpen = this.stateTicketService.getAll().find((s) => s.code === 'open')?.id ?? 0;

    const currentUserId = this.currentUserService.user()?.id ?? 0;

    const body = createCreateUserRequestAdapter(data, currentUserId, stateOpen);

    return this.http.post<CreateUserRequest>(`${this.baseUrl}/create-user-request`, body).pipe(
      takeUntil(this.onDestroy),
      first(),
      map((response: CreateUserRequest) => ({
        data: response,
        error: null,
      })),
      catchError((error: HttpErrorResponse) =>
        of({
          data: null,
          error: error.error as ErrorResponse,
        }),
      ),
      finalize(() => this.loading.set(false)),
    );
  }

  createTicketReassignRequest(
    data: FormCreateRequest,
  ): Observable<ApiResult<any, ErrorResponse>> {
    this.onDestroy.next();
    this.loading.set(true);

    const stateOpen = this.stateTicketService.getAll().find((s) => s.code === 'open')?.id ?? 0;
    const currentUserId = this.currentUserService.user()?.id ?? 0;

    const body = createTicketReassignRequestAdapter(data, currentUserId, stateOpen);

    return this.http.post<any>(`${this.baseUrl}/ticket-reassign-request`, body).pipe(
      takeUntil(this.onDestroy),
      first(),
      map((response: any) => ({ data: response, error: null })),
      catchError((error: HttpErrorResponse) =>
        of({ data: null, error: error.error as ErrorResponse }),
      ),
      finalize(() => this.loading.set(false)),
    );
  }

  private getVoucherActionTypeCode(code: string): string {
    switch (code) {
      case 'TICKET_RELEASE_LT30':
        return 'LIB_30';
      case 'TICKET_IN_PROCESS':
        return 'EN_PROC';
      case 'TICKET_UNLOCK_GT30':
        return 'DESB_30';
      case 'CREDIT_NOTE_CREATE':
        return 'NOTA_CRED';
      case 'CREDIT_NOTE_REVERT':
        return 'REV_NOTA_CRED';
      default:
        return '';
    }
  }
}
