import { Component, computed, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import {
  form,
  FormField,
  hidden,
  maxLength,
  required,
  submit,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { Card } from './components/card/card';
import { Button } from './components/button/button';
import { StatesService } from './services/states';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RequestTypeService } from '../../../../core/services/request-type-service';
import { FormCreateRequest } from './model/create-request.model';
import { SupportModeService } from '../../../../core/services/support-mode';
import { PriorityService } from '../../../../core/services/priority-service';
import { MatDividerModule } from '@angular/material/divider';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { searchSpecialties, SPECIALTIES } from '../../../../core/static/specialties';
import { MOTIVES, searchMotives } from '../../../../core/static/motives';
import { DocumentTypeService } from '../../../../core/services/document-type-service';
import { MatSelectModule } from '@angular/material/select';
import { ContractTypeService } from '../../../../core/services/contract-type-service';
import { SystemRoleService } from '../../../../core/services/system-role-service';
import { RequestType } from '../../../../core/models/requestType.model';
import { SupportMode } from '../../../../core/models/supportMode.model';
import { CreateRequestService } from './services/create-request-service';
import { TicketService } from '../../../../core/services/ticket-service';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Router } from '@angular/router';
import { VoiceInput } from '../../../../core/directives/voice-input-directive';

@Component({
  selector: 'app-create-request',
  imports: [
    MatStepperModule,
    FormField,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    Card,
    Button,
    MatDividerModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatCheckboxModule,
    MatChipsModule,
    VoiceInput,
  ],
  templateUrl: './create-request.html',
  styleUrl: './create-request.css',
})
export default class CreateRequest implements OnInit, OnDestroy {
  private readonly statesService = inject(StatesService);
  private _snackBar = inject(MatSnackBar);
  private requestTypeService = inject(RequestTypeService);
  requestTypes = computed(() => this.requestTypeService.getAll().filter((v) => v.is_active));
  private supportModeService = inject(SupportModeService);
  supportModes = computed(() => this.supportModeService.getAll());
  private priorityService = inject(PriorityService);
  priorities = computed(() => this.priorityService.getAll());
  private documentTypeService = inject(DocumentTypeService);
  documentTypes = computed(() => this.documentTypeService.getAll());
  private contractTypeService = inject(ContractTypeService);
  contractTypes = computed(() => this.contractTypeService.getAll());
  private systemRoleService = inject(SystemRoleService);
  systemRoles = computed(() => this.systemRoleService.getAll());
  private createRequestService = inject(CreateRequestService);
  private ticketService = inject(TicketService);
  private router = inject(Router);

  isLoading = computed(() => this.createRequestService.loading());

  private readonly defaultFormValues: FormCreateRequest = {
    requestTypeId: null,
    supportModeId: null,
    priorityId: null,
    problemDescription: '',
    officeNumber: '',
    speciality: '',
    contactPhone: '',
    anydeskCode: '',
    preferredSupportDate: '',
    motive: '',
    ticketNumber: '',
    firstNames: '',
    lastNames: '',
    documentId: null,
    documentNumber: '',
    position: '',
    contractId: null,
    rolIds: null,
    attachments: null,
    ticketNumbers: null,
    newResponsible: '',
    keepCreating: false,
  };

  formCreateModel = signal<FormCreateRequest>(this.defaultFormValues);

  formCreate = form(this.formCreateModel, (schemaPath) => {
    required(schemaPath.requestTypeId, { message: 'El tipo de solicitud es obligatorio' });
    required(schemaPath.priorityId, { message: 'El estado de prioridad es obligatorio' });
    hidden(schemaPath.supportModeId, ({ valueOf }) => {
      const requestType = this.getRequestType(valueOf(schemaPath.requestTypeId));
      if (requestType === null) return true;

      return requestType.code === 'TICKET_RELEASE_LT30' ||
        requestType.code === 'TICKET_IN_PROCESS' ||
        requestType.code === 'TICKET_UNLOCK_GT30' ||
        requestType.code === 'CREDIT_NOTE_CREATE' ||
        requestType.code === 'CREDIT_NOTE_REVERT' ||
        requestType.code === 'USR_CREATE' ||
        requestType.code === 'TICKET_REASSIGN'
        ? true
        : false;
    });
    required(schemaPath.supportModeId, { message: 'El modo de soporte es obligatorio' });

    hidden(schemaPath.speciality, ({ valueOf }) => {
      const requestType = this.getRequestType(valueOf(schemaPath.requestTypeId));
      if (requestType === null) return true;
      if (requestType.code === 'TICKET_REASSIGN') return true;

      const isVoucherAction =
        requestType.code === 'TICKET_RELEASE_LT30' ||
        requestType.code === 'TICKET_IN_PROCESS' ||
        requestType.code === 'TICKET_UNLOCK_GT30' ||
        requestType.code === 'CREDIT_NOTE_CREATE' ||
        requestType.code === 'CREDIT_NOTE_REVERT';

      if (isVoucherAction) return false;

      const supportMode = this.getSupportMode(valueOf(schemaPath.supportModeId));
      if (supportMode === null) return true;

      return supportMode.code !== 'in-person';
    });
    required(schemaPath.speciality, { message: 'La especilidad es obligatorio' });

    hidden(schemaPath.ticketNumber, ({ valueOf }) => {
      const requestType = this.getRequestType(valueOf(schemaPath.requestTypeId));
      if (requestType === null) return true;

      return requestType.code === 'TICKET_RELEASE_LT30' ||
        requestType.code === 'TICKET_IN_PROCESS' ||
        requestType.code === 'TICKET_UNLOCK_GT30' ||
        requestType.code === 'CREDIT_NOTE_CREATE' ||
        requestType.code === 'CREDIT_NOTE_REVERT'
        ? false
        : true;
    });
    required(schemaPath.ticketNumber, { message: 'El número ticket es obligatorio' });

    hidden(schemaPath.attachments, ({ valueOf }) => {
      const requestType = this.getRequestType(valueOf(schemaPath.requestTypeId));
      if (requestType === null) return true;

      return requestType.code === 'TICKET_RELEASE_LT30' ||
        requestType.code === 'TICKET_IN_PROCESS' ||
        requestType.code === 'TICKET_UNLOCK_GT30' ||
        requestType.code === 'CREDIT_NOTE_CREATE' ||
        requestType.code === 'CREDIT_NOTE_REVERT'
        ? false
        : true;
    });
    required(schemaPath.attachments, { message: 'El documento es obligatorio' });

    hidden(schemaPath.problemDescription, ({ valueOf }) => {
      const requestType = this.getRequestType(valueOf(schemaPath.requestTypeId));
      if (requestType === null) return true;

      return requestType.code === 'OTHER' ||
        requestType.code === 'SYSTEM_ISSUE' ||
        requestType.code === 'SIGNATURE_ISSUE'
        ? false
        : true;
    });
    required(schemaPath.problemDescription, { message: 'La descripción es obligatorio' });
    maxLength(schemaPath.problemDescription, 1000, { message: 'Máximo 1000 caracteres' });

    hidden(schemaPath.contactPhone, ({ valueOf }) => {
      const requestType = this.getRequestType(valueOf(schemaPath.requestTypeId));
      if (requestType === null) return true;

      const supportMode = this.getSupportMode(valueOf(schemaPath.supportModeId));
      if (supportMode === null) return true;

      return (requestType.code === 'OTHER' ||
        requestType.code === 'SYSTEM_ISSUE' ||
        requestType.code === 'SIGNATURE_ISSUE') &&
        supportMode.code === 'virtual'
        ? false
        : true;
    });
    required(schemaPath.contactPhone, { message: 'El número contacto es obligatorio' });

    hidden(schemaPath.preferredSupportDate, ({ valueOf }) => {
      const requestType = this.getRequestType(valueOf(schemaPath.requestTypeId));
      if (requestType === null) return true;

      return requestType.code === 'OTHER' ||
        requestType.code === 'SYSTEM_ISSUE' ||
        requestType.code === 'SIGNATURE_ISSUE'
        ? false
        : true;
    });
    required(schemaPath.preferredSupportDate, { message: 'El horario preferencia es obligatorio' });

    hidden(schemaPath.officeNumber, ({ valueOf }) => {
      const requestType = this.getRequestType(valueOf(schemaPath.requestTypeId));
      if (requestType === null) return true;

      const supportMode = this.getSupportMode(valueOf(schemaPath.supportModeId));
      if (supportMode === null) return true;

      return (requestType.code === 'OTHER' ||
        requestType.code === 'SYSTEM_ISSUE' ||
        requestType.code === 'SIGNATURE_ISSUE') &&
        supportMode.code === 'in-person'
        ? false
        : true;
    });
    required(schemaPath.officeNumber, { message: 'Número consultorio es obligatorio' });

    hidden(schemaPath.firstNames, ({ valueOf }) => {
      const requestType = this.getRequestType(valueOf(schemaPath.requestTypeId));
      if (requestType === null) return true;

      return requestType.code === 'USR_CREATE' ? false : true;
    });
    required(schemaPath.firstNames, { message: 'Los nombres son obligatorio' });

    hidden(schemaPath.lastNames, ({ valueOf }) => {
      const requestType = this.getRequestType(valueOf(schemaPath.requestTypeId));
      if (requestType === null) return true;

      return requestType.code === 'USR_CREATE' ? false : true;
    });
    required(schemaPath.lastNames, { message: 'Los apellidos son obligatorio' });

    hidden(schemaPath.documentId, ({ valueOf }) => {
      const requestType = this.getRequestType(valueOf(schemaPath.requestTypeId));
      if (requestType === null) return true;

      return requestType.code === 'USR_CREATE' ? false : true;
    });
    required(schemaPath.documentId, { message: 'El tipo documento es obligatorio' });

    hidden(schemaPath.documentNumber, ({ valueOf }) => {
      const requestType = this.getRequestType(valueOf(schemaPath.requestTypeId));
      if (requestType === null) return true;

      return requestType.code === 'USR_CREATE' ? false : true;
    });
    required(schemaPath.documentNumber, { message: 'El número documento es obligatorio' });

    hidden(schemaPath.position, ({ valueOf }) => {
      const requestType = this.getRequestType(valueOf(schemaPath.requestTypeId));
      if (requestType === null) return true;

      return requestType.code === 'USR_CREATE' ? false : true;
    });
    required(schemaPath.position, { message: 'El cargo es obligatorio' });

    hidden(schemaPath.contractId, ({ valueOf }) => {
      const requestType = this.getRequestType(valueOf(schemaPath.requestTypeId));
      if (requestType === null) return true;

      return requestType.code === 'USR_CREATE' ? false : true;
    });
    required(schemaPath.contractId, { message: 'El tipo contrato es obligatorio' });

    hidden(schemaPath.rolIds, ({ valueOf }) => {
      const requestType = this.getRequestType(valueOf(schemaPath.requestTypeId));
      if (requestType === null) return true;

      return requestType.code === 'USR_CREATE' ? false : true;
    });
    required(schemaPath.rolIds, { message: 'El rol es obligatorio' });

    hidden(schemaPath.ticketNumbers, ({ valueOf }) => {
      const requestType = this.getRequestType(valueOf(schemaPath.requestTypeId));
      if (requestType === null) return true;
      return requestType.code !== 'TICKET_REASSIGN';
    });
    required(schemaPath.ticketNumbers, { message: 'Ingresá al menos un número de ticket' });

    hidden(schemaPath.newResponsible, ({ valueOf }) => {
      const requestType = this.getRequestType(valueOf(schemaPath.requestTypeId));
      if (requestType === null) return true;
      return requestType.code !== 'TICKET_REASSIGN';
    });
    required(schemaPath.newResponsible, { message: 'El responsable es obligatorio' });
  });

  @ViewChild('stepper') stepper!: MatStepper;

  isKeyRequestTypeOk = this.statesService.getState('requestType');
  isKeySupportModeOk = this.statesService.getState('supportMode');
  isKeyPriorityOk = this.statesService.getState('priority');

  currentRequestType = computed(() => {
    const id = this.isKeyRequestTypeOk();
    if (id === null) return undefined;
    return this.requestTypeService.getById(id);
  });

  currentSupportMode = computed(() => {
    const id = this.isKeySupportModeOk();
    if (id === null) return undefined;
    return this.supportModeService.getById(id);
  });

  // Mobile-friendly progress indicator (the default stepper header is hidden via CSS)
  private hasSupportModeStep = computed(() => {
    const code = this.currentRequestType()?.code;
    return (
      code !== undefined &&
      code !== 'TICKET_RELEASE_LT30' &&
      code !== 'TICKET_IN_PROCESS' &&
      code !== 'TICKET_UNLOCK_GT30' &&
      code !== 'CREDIT_NOTE_CREATE' &&
      code !== 'CREDIT_NOTE_REVERT' &&
      code !== 'USR_CREATE' &&
      code !== 'TICKET_REASSIGN'
    );
  });
  totalSteps = computed(() => (this.hasSupportModeStep() ? 4 : 3));
  stepSegments = computed(() => Array.from({ length: this.totalSteps() }));

  filteredSpecialtiesOption = computed(() => {
    const value = this.formCreateModel().speciality;
    if (SPECIALTIES.find((_) => _.label === value)) return [];
    return searchSpecialties(value);
  });

  filteredMotivesOption = computed(() => {
    const value = this.formCreateModel().motive;
    if (MOTIVES.find((_) => _.label === value)) return [];
    return searchMotives(value);
  });

  isDragOver = signal(false);
  readonly ACCEPTED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  readonly ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.gif,.webp';
  isMobile = signal(false);

  ngOnInit() {
    this.isMobile.set(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }

  updateState(key: string, index: number) {
    switch (key) {
      case 'requestType':
        this.formCreateModel.update((current) => ({
          ...current,
          requestTypeId: index,
        }));
        break;
      case 'supportMode':
        this.formCreateModel.update((current) => ({
          ...current,
          supportModeId: index,
        }));
        break;
      case 'priority':
        this.formCreateModel.update((current) => ({
          ...current,
          priorityId: index,
        }));
        break;
    }
    this.statesService.updateState(key, index);

    setTimeout(() => {
      this.stepper.next();
    });
  }

  navegateNext(key: string) {
    const state = this.statesService.getState(key)();
    if (state === null) {
      this.openSnackBar('Seleccione una de las opciones', 'Cerrar');
      return;
    }
    this.stepper.next();
  }

  navegatePrevious() {
    this.stepper.previous();
  }

  private openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action, {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }

  submit() {
    submit(this.formCreate, async () => {
      const data = this.formCreateModel();
      const codeRequest = this.currentRequestType()?.code ?? '';

      if (
        codeRequest === 'OTHER' ||
        codeRequest === 'SYSTEM_ISSUE' ||
        codeRequest === 'SIGNATURE_ISSUE'
      ) {
        this.createRequestService.createTechnicalSupportRequest(data).subscribe((result) => {
          if (result.error) {
            this.openSnackBar(result.error.message, 'Cerrar');
            return;
          }
          this.openSnackBar('¡Solicitud creada exitosamente!', 'OK');
          this.ticketService.loadData();
          if (data.keepCreating) { this.resetAllStateForm(); return; }
          this.router.navigate(['panel', 'mis-solicitudes']);
        });
      } else if (
        codeRequest === 'TICKET_RELEASE_LT30' ||
        codeRequest === 'TICKET_IN_PROCESS' ||
        codeRequest === 'TICKET_UNLOCK_GT30' ||
        codeRequest === 'CREDIT_NOTE_CREATE' ||
        codeRequest === 'CREDIT_NOTE_REVERT'
      ) {
        this.createRequestService.createVoucherRequest(data).subscribe((result) => {
          if (result.error) {
            this.openSnackBar(result.error.message, 'Cerrar');
            return;
          }
          this.openSnackBar('¡Solicitud creada exitosamente!', 'OK');
          this.ticketService.loadData();
          if (data.keepCreating) { this.resetSpecificStateForm(['ticketNumber', 'attachments']); return; }
          this.router.navigate(['panel', 'mis-solicitudes']);
        });
      } else if (codeRequest === 'USR_CREATE') {
        this.createRequestService.createCreateUserRequest(data).subscribe((result) => {
          if (result.error) {
            this.openSnackBar(result.error.message, 'Cerrar');
            return;
          }
          this.openSnackBar('¡Solicitud creada exitosamente!', 'OK');
          this.ticketService.loadData();
          if (data.keepCreating) {
            this.resetSpecificStateForm(['firstNames', 'lastNames', 'documentId', 'documentNumber', 'position', 'contractId', 'rolIds']);
            return;
          }
          this.router.navigate(['panel', 'mis-solicitudes']);
        });
      } else if (codeRequest === 'TICKET_REASSIGN') {
        this.createRequestService.createTicketReassignRequest(data).subscribe((result) => {
          if (result.error) {
            this.openSnackBar(result.error.message, 'Cerrar');
            return;
          }
          this.openSnackBar('¡Solicitud creada exitosamente!', 'OK');
          this.ticketService.loadData();
          if (data.keepCreating) {
            this.resetSpecificStateForm(['ticketNumbers', 'newResponsible']);
            return;
          }
          this.router.navigate(['panel', 'mis-solicitudes']);
        });
      } else {
        this.openSnackBar('Ocurrio un error', 'Cerrar');
      }
    });
  }

  private resetAllStateForm() {
    this.formCreate().reset(this.defaultFormValues);
    this.stepper.reset();
    this.statesService.clearAll();
  }

  private resetSpecificStateForm(keysToReset: (keyof FormCreateRequest)[]) {
    const currentValues: FormCreateRequest = {
      ...this.formCreateModel(),
    };

    keysToReset.forEach((key) => {
      (currentValues as any)[key] = this.defaultFormValues[key];
    });

    this.formCreate().reset(currentValues);
  }

  private getRequestType(id: number | null): null | RequestType {
    if (id === null) return null;
    const requestType = this.requestTypeService.getById(id);
    if (!requestType) return null;
    return requestType;
  }

  private getSupportMode(id: number | null): null | SupportMode {
    if (id === null) return null;
    const supportMode = this.supportModeService.getById(id);
    if (!supportMode) return null;
    return supportMode;
  }

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  addTicketNumber(event: MatChipInputEvent) {
    const val = (event.value ?? '').trim();
    event.chipInput!.clear();
    if (!val) return;
    const current = this.formCreateModel().ticketNumbers ?? [];
    if (current.includes(val)) return;
    this.formCreateModel.update((c) => ({ ...c, ticketNumbers: [...current, val] }));
  }

  removeTicketNumber(num: string) {
    const current = this.formCreateModel().ticketNumbers ?? [];
    const updated = current.filter((n) => n !== num);
    this.formCreateModel.update((c) => ({
      ...c,
      ticketNumbers: updated.length > 0 ? updated : null,
    }));
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    this.processFiles(files);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.processFiles(files);
    input.value = ''; // reset para permitir subir el mismo archivo
  }

  private processFiles(files: File[]) {
    const valid = files.filter((f) => this.ACCEPTED_TYPES.includes(f.type));
    const invalid = files.filter((f) => !this.ACCEPTED_TYPES.includes(f.type));

    if (invalid.length) {
      this.openSnackBar('Tipo de archivo no permitido. Solo PDF e imágenes.', 'OK');
    }

    if (valid.length > 0) {
      this.formCreateModel.update((state) => ({ ...state, attachments: valid[0] }));
    }
  }

  removeFile() {
    this.formCreateModel.update((state) => ({ ...state, attachments: null }));
  }

  getFileIcon(file: File): string {
    if (file.type === 'application/pdf') return 'picture_as_pdf';
    if (file.type.startsWith('image/')) return 'image';
    return 'insert_drive_file';
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  }

  ngOnDestroy(): void {
    this.resetAllStateForm();
  }
}
