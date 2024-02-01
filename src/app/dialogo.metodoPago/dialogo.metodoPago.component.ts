
import { Component,Inject, OnInit  } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormControl} from '@angular/forms';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { UtilsService } from '../utils.service';
import { HttpClient, HttpHeaders} from '@angular/common/http';
import { TokenService } from '../login/token';

@Component({
  selector: 'app-dialogo.metodo-pago',
  templateUrl: './dialogo.metodoPago.component.html',
  styleUrls: ['./dialogo.metodoPago.component.css'],
  providers: [
    {
      provide: STEPPER_GLOBAL_OPTIONS,
      useValue: { showError: true },
    },
  ],
})
export class DialogoMetodoPagoComponent implements OnInit{

  constructor(public dialogo: MatDialogRef<DialogoMetodoPagoComponent>, @Inject(MAT_DIALOG_DATA) public dataSourceSales: any = [],
    private http: HttpClient, private tokenService: TokenService, public utilsService: UtilsService) { }

  /**
 * Control Error Textfields Pasarela
 */
  firstFormControl = new FormControl('');
  secondFormControl = new FormControl('');

  dataSourceUsuarios: any = [];
  dataSourceSellers: any = [];
  //matcher = new MyErrorStateMatcher();
  isLoadingResults: boolean = false;
  mensajeFallido: string = '';
  mensajeExitoso: string = '';
  pasarela = {
    tipoPago: '',
    efectivo: 0,
    transferencia: 0,
    facturaElectronica: '',
    vendedor: '',
  };


  ngOnInit(): void {
    this.setState(this.firstFormControl, 1);
    this.cargarUsuarios();
  }

  async cargarUsuarios() {
    const rolName = 'seller'
    const token = this.tokenService.token;
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'x-access-token': `${token}`
      })
    };
    this.isLoadingResults = true;
    try {
      this.http.get<any>('https://p02--node-launet--m5lw8pzgzy2k.code.run/api/users', httpOptions)
        .subscribe(response => {
          if (response.Status) {
            this.dataSourceUsuarios = response.Data.docs;
            for (let i = 0; i < this.dataSourceUsuarios.length; i++) {
              if (this.dataSourceUsuarios[i].rolName[0].name === rolName) {
                this.dataSourceSellers = [...this.dataSourceSellers, this.dataSourceUsuarios[i]]
              }
            }
          }
          this.isLoadingResults = false;
        }, error => {
          this.isLoadingResults = false;
          this.mensajeFallido = 'Error al consultar Ubicaciones. Por favor, inténtelo nue{vamente.';
          console.error('Error en la solicitud:', error);
        });
    } catch (error) {
      this.isLoadingResults = false;
      this.mensajeFallido = 'Error al consultar Ubicaciones. Por favor, revisar la consola de Errores.';
      console.error('Error en la solicitud:', error);
    }
  }

  setState(control: FormControl, process: number) {
    this.mensajeFallido = '';
    this.mensajeExitoso = '';
    control.setErrors({ 'incorrect': true })
    if (process === 1) {
      if (this.pasarela.tipoPago === 'EFECTIVO' && this.utilsService.numeros(this.pasarela.efectivo) > 0) {
        if (this.pasarela.efectivo >= this.dataSourceSales.total){
          control.setErrors(null)
          this.secondFormControl.setErrors({ 'incorrect': true });
          if (this.pasarela.efectivo > this.dataSourceSales.total)
          {
            this.mensajeExitoso = 'Valor a devolver ' +this.utilsService.getCurrency(this.pasarela.efectivo-this.dataSourceSales.total)+'         por favor verificar';  
          }
        }else{
          this.mensajeFallido = 'Valor ingresado   ' +this.utilsService.getCurrency(this.pasarela.efectivo)+ '   menor al valor total a cobrar   '+this.utilsService.getCurrency(this.dataSourceSales.total);
        }
        
      }
      if (this.pasarela.tipoPago === 'TRANSFERENCIA' && this.utilsService.numeros(this.pasarela.transferencia) > 0) {
        if (this.pasarela.transferencia >= this.dataSourceSales.total){
          control.setErrors(null)
          this.secondFormControl.setErrors({ 'incorrect': true });
          if (this.pasarela.transferencia > this.dataSourceSales.total)
          {
            this.mensajeExitoso = 'Valor a devolver ' +this.utilsService.getCurrency(this.pasarela.transferencia-this.dataSourceSales.total)+'         por favor verificar';  
          }
        }else{
          this.mensajeFallido = 'Valor ingresado   ' +this.utilsService.getCurrency(this.pasarela.transferencia)+ '   menor al valor total a cobrar   '+this.utilsService.getCurrency(this.dataSourceSales.total);
        }
      }
      if (this.pasarela.tipoPago === 'MIXTO' && (this.utilsService.numeros(this.pasarela.efectivo) > 0 && this.utilsService.numeros(this.pasarela.transferencia) > 0)) {
        let suma = this.utilsService.sumarNumeros(this.pasarela.transferencia, this.pasarela.efectivo)
        if (suma >= this.dataSourceSales.total){          
          control.setErrors(null)
          this.secondFormControl.setErrors({ 'incorrect': true });
          if (suma > this.dataSourceSales.total)
          {
            this.mensajeExitoso = 'Valor a devolver ' +this.utilsService.getCurrency(suma-this.dataSourceSales.total)+ '         por favor verificar';  
          }
        }else{
          this.mensajeFallido = 'Valor ingresado   ' +this.utilsService.getCurrency(suma)+ '   menor al valor total a cobrar   '+this.utilsService.getCurrency(this.dataSourceSales.total);
        }
      }
    }
    if (process === 2) {
      if (this.pasarela.facturaElectronica !== "" && this.pasarela.vendedor !== "") {
        control.setErrors(null)
      }
    }
  }

  confirmarVenta() {
    this.dataSourceSales.formaDePago = this.pasarela.tipoPago
    this.dataSourceSales.cantidadEfectivo = this.utilsService.numeros(this.pasarela.efectivo) > 0? this.utilsService.numeros(this.pasarela.efectivo) : 0;
    this.dataSourceSales.cantidadTransferencia = this.utilsService.numeros(this.pasarela.transferencia) > 0? this.utilsService.numeros(this.pasarela.transferencia) : 0;
    this.dataSourceSales.facturacionElectronica = this.pasarela.facturaElectronica;
    this.dataSourceSales.vendedor = this.pasarela.vendedor
    this.dialogo.close(true);
  }

  changeList(value:any)
  {
    this.pasarela.efectivo = value === 'TRANSFERENCIA'? 0 : this.pasarela.efectivo;
    this.pasarela.transferencia = value === 'EFECTIVO'? 0 : this.pasarela.transferencia;
  }
}
