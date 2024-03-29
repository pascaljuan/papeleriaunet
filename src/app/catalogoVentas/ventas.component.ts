import { ChangeDetectorRef, Component, ViewChild, ElementRef, AfterViewInit, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { TokenService } from '../login/token';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { FormControl, FormGroupDirective, NgForm, Validators } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { DialogoConfirmacionComponent } from "../dialogo.confirmacion/dialogo.component";
import { DialogoCarItemComponent } from "../dialogo.carItem/dialogo.carItem.component";
import { DialogoMetodoPagoComponent } from '../dialogo.metodoPago/dialogo.metodoPago.component';
import { MatSort } from '@angular/material/sort';
import { NavigationEnd, Router } from '@angular/router';
import { LocalStorageService } from '../local-storage.service';
import { Subscription } from 'rxjs/internal/Subscription';
import { filter } from 'rxjs';
import { UtilsService } from '../utils.service';

@Component({
  selector: 'app-ventas',
  templateUrl: './ventas.component.html',
  styleUrls: ['./ventas.component.css']
})
export class VentasComponent implements AfterViewInit, OnInit {

  constructor(private router: Router, private http: HttpClient, public tokenService: TokenService, public dialogo: MatDialog,
    public localStorageService: LocalStorageService, private changeDetector: ChangeDetectorRef, public utilsService: UtilsService,
    public elementRef: ElementRef) { }

  columnas: string[] = ['codigoBarras', 'descripcion', 'referencia', 'marca', 'ubicacion', 'unidadMedida', 'stock', 'precioventa', 'accion'];
  columnasCarItem: string[] = ['descripcion', 'cantidad', 'precio', 'total', 'isEdit'];

  usbDevice: any = [];
  openedMenu!: boolean;
  openedCustomer!: boolean;
  dataSourceCatalogo: any = [];
  dataSourceClientes: any = [];
  dataSourceCarItem: any = [];
  dataSourceSales: any = [];
  dataSourceSalesArticle: any = [];
  isLoadingResults: boolean = false;
  //Pagination
  pageEvent!: PageEvent;
  pageIndex: number = 0;
  pageSize !: number;
  length!: number;
  pageSizeOptions = [20];
  //Storage
  localStorageToken !: any;
  localStorageUser !: any;
  subscriber!: Subscription;
  //Calculos
  operaciones: any = {
    cantidadArticulos: 0,
    subtotalCompra: 0,
    subtotalCompraArray: [],
    impuestoCompra: 0,
    impuestoCompraArray: [],
    descuentoCompra: 0,
    descuentoCompraArray: [],
    totalCompra: 0,
    totalCompraArray: [],
    totalArticulos: 0,
    totalArticulosArray: [],
    subtotalCompraMayoreo: 0,
    subtotalCompraMayoreoArray: [],

  }
  /**
   * Control Error Textfields Articles
   */
  codigoBarrasFormControl = new FormControl('', [Validators.required]);
  descripcionFormControl = new FormControl('', [Validators.required]);
  marcaFormControl = new FormControl('', [Validators.required]);
  referenciaFormControl = new FormControl('', [Validators.required]);
  unidadMedidaFormControl = new FormControl('', [Validators.required]);
  codigoUbicacionFormControl = new FormControl('', [Validators.required]);
  nuevoArticulo = {
    codigoBarras: '',
    descripcion: '',
    unidadMedida: '',
    codigoUbicacion: '',
    marca: '',
    referencia: ''
  };

  /**
 * Control Error Textfields Customers
 */
  emailFormControl = new FormControl('', [Validators.required, Validators.email]);
  tipoDocumentoFormControl = new FormControl('', [Validators.required]);
  numeroDocumentoFormControl = new FormControl('', [Validators.required]);
  nombreRazonSocialFormControl = new FormControl('', [Validators.required]);
  telefonoFormControl = new FormControl('', [Validators.required]);
  direccionFormControl = new FormControl('', [Validators.required]);
  departamentoFormControl = new FormControl('', [Validators.required]);
  municipioFormControl = new FormControl('', [Validators.required]);
  barrioFormControl = new FormControl('', [Validators.required]);
  tipoClienteFormControl = new FormControl('', [Validators.required]);

  nuevoCliente: any = {
    tipoDocumento: '',
    numeroDocumento: '',
    nombreRazonSocial: '',
    telefono: '',
    extension: "",
    direccion: '',
    departamento: '',
    municipio: '',
    email: '',
    tipoCliente: '',
    barrio: ''
  };

  /**
 * Control Error Textfields Consultar Customers
 */
  consultaNumeroDocumentoFormControl = new FormControl('', [Validators.required]);
  consultaCliente: any = {
    tipoDocumento: '',
    numeroDocumento: '1111111111',
    nombreRazonSocial: '',
    email: ''
  };


  /**
* Control Error Textfields Consultas
*/

  buscarDescripcionFormControl = new FormControl('');
  buscarCodigoBarrasFormControl = new FormControl('');
  nuevaBusqueda: any = {
    buscarDescripcion: '',
    buscarCodigoBarras: ''
  };

  matcher = new MyErrorStateMatcher();
  mensajeExitoso: string = '';
  mensajeFallido: string = '';
  mensajeExitosoCliente: string = '';
  mensajeFallidoCliente: string = '';

  @ViewChild(MatSort, { static: true }) sort!: MatSort;
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  @ViewChild("inputCode") InputField: any = ElementRef;



  ngOnInit() {
    this.subscriber = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => { });
    this.localStorageToken = this.localStorageService.getItem('access_token');
    this.localStorageUser = this.localStorageService.getItem('user_key');
    this.localStorageService.clear();
    this.localStorageService.setItem('access_token', this.localStorageToken);
    this.localStorageService.setItem('user_key', this.localStorageUser);
    this.buscarCliente();
  }

  ngOnDestroy() {
    this.subscriber?.unsubscribe();
  }

  ngAfterContentChecked() {
    this.changeDetector.detectChanges();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.InputField.nativeElement.focus();
    }, 500);
  }

  async buscarCliente() {
    const token = this.tokenService.token;
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'x-access-token': `${token}`,
      })
    };

    let httpParams = new HttpParams();
    httpParams = httpParams.append('numeroDocumento', this.consultaCliente.numeroDocumento);
    this.isLoadingResults = true;
    try {
      this.http.get<any>(`https://p02--node-launet--m5lw8pzgzy2k.code.run/api/customers?${httpParams}`, httpOptions)
        .subscribe(response => {
          if (response.Status) {
            this.dataSourceClientes = response.Data.docs.length > 0 ? response.Data.docs : null;
            this.consultaCliente.nombreRazonSocial = this.dataSourceClientes !== null ? this.dataSourceClientes[0].nombreRazonSocial : "NO EXISTE"
            this.consultaCliente.tipoDocumento = this.dataSourceClientes !== null ? this.dataSourceClientes[0].tipoDocumento : "NO EXISTE"
            this.consultaCliente.numeroDocumento = this.dataSourceClientes !== null ? this.dataSourceClientes[0].numeroDocumento : null
            this.consultaCliente.email = this.dataSourceClientes !== null ? this.dataSourceClientes[0].email : null
          }
          this.isLoadingResults = false;
          //this.enviarImpresion();
        }, error => {
          this.isLoadingResults = false;
          if (error.status === 401) {
            this.routerLinkLogin();
          }
          console.error('Error en la solicitud:', error);
        });
    } catch (error) {
      this.isLoadingResults = false;
      this.mensajeFallido = 'Error al consultar. Por favor, revisar la consola de Errores.';
      console.error('Error en la solicitud:', error);
    }
  }

  async buscarCatalogo(process: number) {
    this.mensajeFallido = "";
    const token = this.tokenService.token;
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'x-access-token': `${token}`,
      })
    };

    let httpParams = new HttpParams();
    httpParams = process === 0 ? httpParams.append('descripcion', this.nuevaBusqueda.buscarDescripcion) : httpParams.append('codigoBarras', this.nuevaBusqueda.buscarCodigoBarras);
    this.isLoadingResults = true;
    try {
      this.http.get<any>(`https://p02--node-launet--m5lw8pzgzy2k.code.run/api/articles?${httpParams}`, httpOptions)
        .subscribe(response => {
          if (response.Status) {
            this.dataSourceCatalogo = new MatTableDataSource(response.Data.docs);
            if (response.Data.totalDocs === 0) {
              this.mensajeFallido = 'Articulo no encontrado';
            } else {
              if (response.Data.docs.length === 1) {
                this.addToCart(response.Data.docs[0])
              }
            }
          }
          this.isLoadingResults = false;
        }, error => {
          this.isLoadingResults = false;
          if (error.status === 401) {
            this.routerLinkLogin();
          }
          console.error('Error en la solicitud:', error);
        });
    } catch (error) {
      this.mensajeFallido = 'Error al consultar. Por favor, revisar la consola de Errores.';
      console.error('Error en la solicitud:', error);
    }
    if (process > 0) {
      this.nuevaBusqueda.buscarCodigoBarras = "";
    }
    this.InputField.nativeElement.focus();
  }

  filtrar(event: Event) {
    const filtro = (event.target as HTMLInputElement).value;
    this.dataSourceCatalogo.filter = filtro.trim().toLowerCase();
    this.isLoadingResults = false;
  }

  mostrarDialogo(message: string, process: number, element: any, i: number): void {
    this.dialogo
      .open(DialogoConfirmacionComponent, {
        data: message
      })
      .afterClosed()
      .subscribe((confirmar: Boolean) => {
        if (confirmar) {
          if (process === 1) {
            this.routerLinkArticulo();
          }
          if (process === 2) {
            this.refreshPage();
          }
          if (process === 3) {
            this.borrarArticuloCarItem(element, i);
          }
        } else {
          //alert("No hacer nada");
        }
      });
  }

  mostrarArticuloCarItem(element: any = [], i: number): void {
    element.isEdit = true;
    this.dialogo
      .open(DialogoCarItemComponent, {
        data: element
      })
      .afterClosed()
      .subscribe((confirmar: boolean) => {
        try {
          if (confirmar) {
            element.isEdit = false;
            this.changeQty(element, i, 0, 'replace');
          } else {
            element.isEdit = false;
          }
        } catch (error) {
          //alert("No hacer nada");
        }
        element.isEdit = false;
      });
  }

  mostrarMetodoPagoCarItem(element: any = []): void {
    //Cargamos el Json Principal sin detalle Articulos
    this.dataSourceSales =
    {
      "numeroFactura": new Date().getTime(),
      "fechaFactura": this.utilsService.getDate(null),
      "fechaVencimiento": this.utilsService.getDate(null),
      "subtotal": this.operaciones.subtotalCompra,
      "impuesto": this.operaciones.impuestoCompra,
      "descuento": this.operaciones.descuentoCompra,
      "total": this.operaciones.subtotalCompra - this.operaciones.descuentoCompra,
      "cliente": {
        "nombreRazonSocial": this.consultaCliente.nombreRazonSocial,
        "tipoDocumento": this.consultaCliente.tipoDocumento,
        "numeroDocumento": this.consultaCliente.numeroDocumento,
        "email": this.consultaCliente.email,
      },
      "articulo": "",
      "formaDePago": "",
      "cantidadEfectivo": "",
      "cantidadTransferencia": "",
      "facturacionElectronica": "",
      "vendedor": "",
    }

    this.dialogo
      .open(DialogoMetodoPagoComponent, {
        data: this.dataSourceSales
      })
      .afterClosed()
      .subscribe((confirmar: boolean) => {
        try {
          if (confirmar) {
            this.guardarVenta();
          }
        } catch (error) {
          //alert("No hacer nada");
        }
      });
  }

  async guardarVenta() {
    //Cargamos los articulos por iteración Principal
    this.dataSourceSalesArticle = [];
    for (let i = 0; i < this.dataSourceCarItem.length; i++) {
      this.dataSourceSalesArticle = [...this.dataSourceSalesArticle, this.dataSourceCarItem[i].detalleArticulo[0]]
    }
    //Caergamos los articulos a la venta
    this.dataSourceSales.articulo = this.dataSourceSalesArticle;
    const url = 'https://p01--node-launet2--m5lw8pzgzy2k.code.run/api/sales';
    //const url = 'http://localhost:3030/api/sales';
    const token = this.tokenService.token;
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'x-access-token': `${token}`
      })
    };
    this.isLoadingResults = true;
    try {
      const response = await this.http.post(url, this.dataSourceSales, httpOptions).toPromise();
      this.mensajeExitoso = "Venta guardada correctamente.";
      this.isLoadingResults = false;
      //this.connectToPrinter(false);
      setTimeout(() => {
        this.refreshPage();
      }, 100);
    } catch (error) {
      this.isLoadingResults = false;
      this.mensajeFallido = 'Error al guardar. Por favor, revisar la consola de Errores.';
      console.error('Error en la solicitud:', error);
    }
  }

  async guardarCliente() {
    this.mensajeFallidoCliente = "";
    const url = `https://p02--node-launet--m5lw8pzgzy2k.code.run/api/customers`
    const token = this.tokenService.token;
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'x-access-token': `${token}`
      })
    };
    this.isLoadingResults = true;
    try {
      const response = await this.http.post(url, this.nuevoCliente, httpOptions).toPromise();
      this.isLoadingResults = false;
      this.mensajeExitosoCliente = "Cliente guardado exitosamente"
      setTimeout(() => {
        this.openedCustomer = false;
        this.setCliente();
      }, 100);
    } catch (error) {
      this.isLoadingResults = false;
      this.mensajeFallidoCliente = 'Error al guardar. Por favor, revisar la consola de Errores.';
      console.error('Error en la solicitud:', error);
    }
  }

  setCliente() {
    this.nuevoCliente.tipoDocumento = '';
    this.tipoDocumentoFormControl.reset();
    this.nuevoCliente.numeroDocumento = '';
    this.numeroDocumentoFormControl.reset();
    this.nuevoCliente.nombreRazonSocial = '';
    this.nombreRazonSocialFormControl.reset();
    this.nuevoCliente.telefono = '';
    this.telefonoFormControl.reset();
    this.nuevoCliente.direccion = '';
    this.direccionFormControl.reset();
    this.nuevoCliente.departamento = '';
    this.departamentoFormControl.reset();
    this.nuevoCliente.municipio = '';
    this.municipioFormControl.reset();
    this.nuevoCliente.email = '';
    this.emailFormControl.reset();
    this.nuevoCliente.tipoCliente = '';
    this.tipoClienteFormControl.reset();
    this.nuevoCliente.barrio.reload = '';
    this.barrioFormControl.reset();
    this.mensajeExitosoCliente = '';
    this.mensajeFallidoCliente = '';
  };

  routerLinkArticulo(): void {
    this.router.navigate(['/registrarArticulo'])
  };

  routerLinkLogin(): void {
    this.router.navigate(['/login'])
    this.localStorageService.clear();
  };

  refreshPage() {
    window.location.reload();
  }

  borrarArticuloCarItem(element: any = [], i: number) {
    this.localStorageService.removeItem(element._id);
    this.dataSourceCarItem.splice(i, 1);
    this.dataSourceCarItem = [...this.dataSourceCarItem];
    this.operaciones.cantidadArticulos = this.dataSourceCarItem.length

    if (this.operaciones.cantidadArticulos > 0) {
      this.operaciones.totalArticulosArray.splice(i, 1);
      this.operaciones.totalArticulosArray = [...this.operaciones.totalArticulosArray];
      this.operaciones.totalArticulos = this.operaciones.totalArticulosArray.reduce((accumulator: number, currentValue: number) => accumulator + currentValue);
      this.operaciones.subtotalCompraArray.splice(i, 1);
      this.operaciones.subtotalCompraArray = [...this.operaciones.subtotalCompraArray];
      this.operaciones.subtotalCompra = this.operaciones.subtotalCompraArray.reduce((accumulator: number, currentValue: number) => accumulator + currentValue);
      this.operaciones.descuentoCompraArray.splice(i, 1);
      this.operaciones.descuentoCompraArray = [...this.operaciones.descuentoCompraArray];
      this.operaciones.descuentoCompra = this.operaciones.descuentoCompraArray.reduce((accumulator: number, currentValue: number) => accumulator + currentValue);
    } else {
      this.setOperaciones();
    }
  }

  addToCart(element: any = []) {
    try {
      if (JSON.parse(this.localStorageService.getItem(element._id)!)) {
        for (let i = 0; i < this.dataSourceCarItem.length; i++) {
          if (this.dataSourceCarItem[i]._id === element._id) {
            if ((this.dataSourceCarItem[i].detalleArticulo[0].cantidad + 1) > element.inventarios[0].stock) {
              alert(`No hay suficiente Stock ${element.inventarios[0].stock}, para la cantidad de productos solicitados ${this.dataSourceCarItem[i].detalleArticulo[0].cantidad + 1}!`)
              break
            }
            this.changeQty(this.dataSourceCarItem[i], i, 1, '');
            break
          }
        }
      } else {
        const addItem: number = 1;
        if (!element.inventarios[0] || !element.precios[0]) {
          alert(`Articulo sin configuración de Inventario y/o Precio Venta`);
          return;
        }
        element =
        {
          "_id": element._id,
          "stock": this.utilsService.numeros(element.inventarios[0].stock),
          "detalleArticulo": [
            {
              "codigo": element.codigo,
              "codigoBarras": element.codigoBarras,
              "descripcion": element.descripcion,
              "cantidad": addItem,
              "precioVenta": this.utilsService.numeros(element.precios[0].precioVenta) > 0 ? element.precios[0].precioVenta : 0,
              "precioMayoreo": this.utilsService.numeros(element.precios[0].precioMayoreo) > 0 ? element.precios[0].precioMayoreo : 0,
              "precioInterno": this.utilsService.numeros(element.precios[0].precioInterno) > 0 ? element.precios[0].precioInterno : 0,
              "descuento": 0,
              "subtotal": this.utilsService.multiplicarNumero(this.utilsService.numeros(element.precios[0].precioVenta), addItem),
              "impuesto": this.utilsService.numeros(element.precios[0].impuestoUnitario) > 0 ? this.utilsService.numeros(element.precios[0].impuestoUnitario) : 0,
              "total": this.utilsService.multiplicarNumero(this.utilsService.numeros(element.precios[0].precioVenta), addItem),
              "mayoreo": false,
              "interno": false
            }
          ]
        }
        this.localStorageService.setItem(element._id, JSON.stringify(element));
        this.dataSourceCarItem = [...this.dataSourceCarItem, JSON.parse(this.localStorageService.getItem(element._id)!)]
        this.operaciones.cantidadArticulos = this.dataSourceCarItem.length

        this.operaciones.totalArticulosArray = [...this.operaciones.totalArticulosArray, (parseInt(this.dataSourceCarItem[this.operaciones.cantidadArticulos - 1].detalleArticulo[0].cantidad))]
        this.operaciones.totalArticulos = this.operaciones.totalArticulosArray.reduce((accumulator: number, currentValue: number) => accumulator + currentValue);

        this.operaciones.subtotalCompraArray = [...this.operaciones.subtotalCompraArray, this.utilsService.multiplicarNumero(this.dataSourceCarItem[this.operaciones.cantidadArticulos - 1].detalleArticulo[0].precioVenta, this.dataSourceCarItem[this.operaciones.cantidadArticulos - 1].detalleArticulo[0].cantidad)]
        this.operaciones.subtotalCompra = this.operaciones.subtotalCompraArray.reduce((accumulator: number, currentValue: number) => accumulator + currentValue);

        this.operaciones.descuentoCompraArray = [...this.operaciones.descuentoCompraArray, this.utilsService.calcularDescuento(this.operaciones.subtotalCompraArray[this.operaciones.cantidadArticulos - 1], this.dataSourceCarItem[this.operaciones.cantidadArticulos - 1].detalleArticulo[0].descuento)]
        this.operaciones.descuentoCompra = this.operaciones.descuentoCompraArray.reduce((accumulator: number, currentValue: number) => accumulator + currentValue);
      }
    } catch (error) {
      this.isLoadingResults = false;
      this.mensajeFallidoCliente = 'Error al cargar el producto. Por favor, revisar la consola de Errores.';
      console.error('Error en la solicitud:', error);
    }

  }

  changeQty(element: any = [], i: number, qty: any, process: any) {

    if (process === 'replace') {
      this.localStorageService.removeItem(element._id);
      this.dataSourceCarItem[i].detalleArticulo[0].subtotal = this.utilsService.multiplicarNumero(element.detalleArticulo[0].precioVenta, element.detalleArticulo[0].cantidad);
      if (element.detalleArticulo[0].mayoreo) {
        this.dataSourceCarItem[i].detalleArticulo[0].descuento = this.utilsService.calcularDescuentoMayoreoInterno(element.detalleArticulo[0].subtotal, this.utilsService.multiplicarNumero(element.detalleArticulo[0].precioMayoreo, element.detalleArticulo[0].cantidad));
      }
      if (element.detalleArticulo[0].interno) {
        this.dataSourceCarItem[i].detalleArticulo[0].descuento = this.utilsService.calcularDescuentoMayoreoInterno(element.detalleArticulo[0].subtotal, this.utilsService.multiplicarNumero(element.detalleArticulo[0].precioInterno, element.detalleArticulo[0].cantidad));
      }
      if (!element.detalleArticulo[0].interno && !element.detalleArticulo[0].mayoreo) {
        this.dataSourceCarItem[i].detalleArticulo[0].descuento = 0;
      }
      this.dataSourceCarItem[i].detalleArticulo[0].total = this.utilsService.restarNumeros(this.dataSourceCarItem[i].detalleArticulo[0].subtotal, this.dataSourceCarItem[i].detalleArticulo[0].descuento)

      this.localStorageService.setItem(element._id, JSON.stringify(element));
      this.dataSourceCarItem.splice(i, 1, JSON.parse(this.localStorageService.getItem(this.dataSourceCarItem[i]._id)!));
      this.dataSourceCarItem = [...this.dataSourceCarItem];


      this.operaciones.totalArticulosArray.splice(i, 1, (parseInt(this.dataSourceCarItem[i].detalleArticulo[0].cantidad)));
      this.operaciones.totalArticulosArray = [...this.operaciones.totalArticulosArray];
      this.operaciones.totalArticulos = this.operaciones.totalArticulosArray.reduce((accumulator: number, currentValue: number) => accumulator + currentValue);

      this.operaciones.subtotalCompraArray.splice(i, 1, this.dataSourceCarItem[i].detalleArticulo[0].subtotal);
      this.operaciones.subtotalCompraArray = [...this.operaciones.subtotalCompraArray];
      this.operaciones.subtotalCompra = this.operaciones.subtotalCompraArray.reduce((accumulator: number, currentValue: number) => accumulator + currentValue);

      this.operaciones.descuentoCompraArray.splice(i, 1, this.dataSourceCarItem[i].detalleArticulo[0].descuento);
      this.operaciones.descuentoCompraArray = [...this.operaciones.descuentoCompraArray];
      this.operaciones.descuentoCompra = this.operaciones.descuentoCompraArray.reduce((accumulator: number, currentValue: number) => accumulator + currentValue);
      return;
    } else {
      if ((this.dataSourceCarItem[i].detalleArticulo[0].cantidad + qty) > element.stock) {
        alert(`No hay suficiente Stock ${element.stock}, para la cantidad de productos solicitados ${(this.dataSourceCarItem[i].detalleArticulo[0].cantidad + qty)}!`)
        return;
      }
      if ((this.dataSourceCarItem[i].detalleArticulo[0].cantidad + qty) === 0) {
        this.borrarArticuloCarItem(this.dataSourceCarItem[i], i);
        return;
      }

      this.dataSourceCarItem[i].detalleArticulo[0].cantidad = this.dataSourceCarItem[i].detalleArticulo[0].cantidad + qty;
    }
    this.localStorageService.removeItem(this.dataSourceCarItem[i]._id);
    this.dataSourceCarItem[i].detalleArticulo[0].subtotal = this.utilsService.multiplicarNumero(this.dataSourceCarItem[i].detalleArticulo[0].precioVenta, this.dataSourceCarItem[i].detalleArticulo[0].cantidad);
    if (this.dataSourceCarItem[i].detalleArticulo[0].mayoreo) {
      this.dataSourceCarItem[i].detalleArticulo[0].descuento = this.utilsService.calcularDescuentoMayoreoInterno(this.dataSourceCarItem[i].detalleArticulo[0].subtotal, this.utilsService.multiplicarNumero(this.dataSourceCarItem[i].detalleArticulo[0].precioMayoreo, this.dataSourceCarItem[i].detalleArticulo[0].cantidad));
    }
    if (this.dataSourceCarItem[i].detalleArticulo[0].interno) {
      this.dataSourceCarItem[i].detalleArticulo[0].descuento = this.utilsService.calcularDescuentoMayoreoInterno(this.dataSourceCarItem[i].detalleArticulo[0].subtotal, this.utilsService.multiplicarNumero(this.dataSourceCarItem[i].detalleArticulo[0].precioInterno, this.dataSourceCarItem[i].detalleArticulo[0].cantidad));
    }
    if (!this.dataSourceCarItem[i].detalleArticulo[0].interno && !this.dataSourceCarItem[i].detalleArticulo[0].mayoreo) {
      this.dataSourceCarItem[i].detalleArticulo[0].descuento = 0;
    }
    this.dataSourceCarItem[i].detalleArticulo[0].total = this.utilsService.restarNumeros(this.dataSourceCarItem[i].detalleArticulo[0].subtotal, this.dataSourceCarItem[i].detalleArticulo[0].descuento)

    this.localStorageService.setItem(this.dataSourceCarItem[i]._id, JSON.stringify(this.dataSourceCarItem[i]));
    this.dataSourceCarItem.splice(i, 1, JSON.parse(this.localStorageService.getItem(this.dataSourceCarItem[i]._id)!));
    this.dataSourceCarItem = [...this.dataSourceCarItem];

    this.operaciones.totalArticulosArray.splice(i, 1, (parseInt(this.dataSourceCarItem[i].detalleArticulo[0].cantidad)));
    this.operaciones.totalArticulosArray = [...this.operaciones.totalArticulosArray];
    this.operaciones.totalArticulos = this.operaciones.totalArticulosArray.reduce((accumulator: number, currentValue: number) => accumulator + currentValue);

    this.operaciones.subtotalCompraArray.splice(i, 1, this.dataSourceCarItem[i].detalleArticulo[0].subtotal);
    this.operaciones.subtotalCompraArray = [...this.operaciones.subtotalCompraArray];
    this.operaciones.subtotalCompra = this.operaciones.subtotalCompraArray.reduce((accumulator: number, currentValue: number) => accumulator + currentValue);

    this.operaciones.descuentoCompraArray.splice(i, 1, this.dataSourceCarItem[i].detalleArticulo[0].descuento);
    this.operaciones.descuentoCompraArray = [...this.operaciones.descuentoCompraArray];
    this.operaciones.descuentoCompra = this.operaciones.descuentoCompraArray.reduce((accumulator: number, currentValue: number) => accumulator + currentValue);
  }

  cancelarCambios(element: any, i: number) {
    element.isEdit = false;
    this.dataSourceCarItem.splice(i, 1, JSON.parse(this.localStorageService.getItem(element._id)!));
    this.dataSourceCarItem = [...this.dataSourceCarItem];
  }

  setOperaciones() {
    this.operaciones.cantidadArticulos = 0,
      this.operaciones.subtotalCompra = 0,
      this.operaciones.subtotalCompraArray = [],
      this.operaciones.impuestoCompra = 0,
      this.operaciones.impuestoCompraArray = [],
      this.operaciones.descuentoCompra = 0,
      this.operaciones.descuentoCompraArray = [],
      this.operaciones.totalCompra = 0,
      this.operaciones.totalCompraArray = [],
      this.operaciones.totalArticulos = 0,
      this.operaciones.totalArticulosArray = []
  };

  async connectToPrinter(value: boolean) {
    try {
      this.usbDevice = await (navigator as any).usb.getDevices()
      if (this.usbDevice.length > 0) {
        this.usbDevice.forEach((value: any, index: number) => {
          //Por el momento nombre de la impresora quemados en codigo si tiene mas de 1 dispositivo vinculado
          if (value.productName === "TM-T88V") {
            this.usbDevice = value;
            return;
          }
        });
      };
      if (this.usbDevice.length !== undefined) {
        this.usbDevice = await (navigator as any).usb.requestDevice({ filters: [{ productName: 'TM-T88V' }] })
        if (this.usbDevice.length > 1) {
          this.usbDevice.forEach((value: any, index: number) => {
            //Por el momento nombre de la impresora quemados en codigo si tiene mas de 1 dispositivo vinculado
            if (value.productName === "TM-T88V") {
              this.usbDevice = value;
              return;
            }
          });
        };
      };
      this.sendToPrinter(value);
    } catch (error) {
      console.error('Error conectando dispositivo USB:', error);
    }
  };

  async sendToPrinter(value: boolean) {
    try {
      if (this.usbDevice) {
        //Configuración del TSPL
        if (!value) {
          const cmd = ['\x10' + '\x14' + '\x01' + '\x00' + '\x05'];
          await this.usbDevice.open()
            .then(() => this.usbDevice.selectConfiguration(1))
            .then(() => this.usbDevice.claimInterface(this.usbDevice.configuration.interfaces[0]?.interfaceNumber))
            await this.usbDevice.transferOut(
              this.usbDevice.configuration.interfaces[0]?.alternate.endpoints.find((obj: any) => obj.direction === 'out').endpointNumber,
              new Uint8Array(
                new TextEncoder().encode(cmd.join())
              )
              );
        } else {
          //'DIRECTION 0\r\nCLS\r\nTEXT 56,24,"3",0,1,1,"ABC"\r\nPRINT 1\r\n',
          //{ type: 'raw', format: 'image', flavor: 'file', data: 'assets/img/image_sample_bw.png', options: { language: "ESCPOS", dotDensity: 'double' } },
          const cmd = [        
            '\x1B' + '\x40'+          // init
            //'\x1D' + '\x56'  + '\x31'+ // Cut
            '\x0A'+                   // line break
            '\x1B' + '\x61' + '\x31'+ // center align
            'PAPELERIA PUNTO U' + '\x0A'+
            '\x0A'+                   // line break
            '\x10' + '\x14' + '\x01' + '\x00' + '\x05' // Cash Drawer
            ];
          await this.usbDevice.open()
            .then(() => this.usbDevice.selectConfiguration(1))
            .then(() => this.usbDevice.claimInterface(this.usbDevice.configuration.interfaces[0]?.interfaceNumber))
          await this.usbDevice.transferOut(
            this.usbDevice.configuration.interfaces[0]?.alternate.endpoints.find((obj: any) => obj.direction === 'out').endpointNumber,
            new Uint8Array(
              new TextEncoder().encode(cmd.join())
            )
          );
        }
        await this.usbDevice.releaseInterface(0);
        await this.usbDevice.close();
      }
    } catch (error) {
      console.error("Error enviando a la impresora:", error);
    }
  };

  async disconnectToDevice() {
    try {
      if (this.usbDevice) {
        await this.usbDevice.close();
        console.log('Disconnected from USB device.');
      }
    } catch (error) {
      console.error('Error disconnecting from USB device:', error);
    }
  };

};

export class Catalogo {
  constructor(public codigoBarras: String, public descripcion: String, public marca: string, public referencia: string,
    public ubicacion: string, public unidadMedida: string, public stock: string, public precioventa: string
  ) { }
}

export class carItem {
  constructor(public descripcion: String, public cantidad: string, public precio: string, public iva: string, public total: string, public isEdit: string) { }
}

/** Error when invalid control is dirty, touched, or submitted. */
export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
  }

}