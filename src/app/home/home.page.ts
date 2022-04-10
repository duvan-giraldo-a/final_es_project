import { Component, OnInit } from '@angular/core';
import { BluetoothSerial } from '@ionic-native/bluetooth-serial/ngx';
import { AlertController } from '@ionic/angular';


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit{

  constructor(private bluetoothSerial: BluetoothSerial,private alertControler: AlertController) {}

  temperatura = 0;
  luminosidad = 0;
  porcentaje = 0;
  intensidad = 0;
  sendCommand = 0x80;
  getCommand = 0x00;
  avaliableTemperature = false;
  avaliableLuminosity = false;
  toggleVariable = false;
  dataMotor = new Uint8Array(4);
  dataLED = new Uint8Array(4);
  counter = 0;
  isNotConnected:Boolean = true;
  devices = [];
  dataReceived = [];

  ngOnInit(): void {
    this.bluetoothState();
    this.bluetoothSerial.clear();
    setInterval(()=>{this.getVariables();}, 1000);
  }

  sendIntensity(){
    this.dataLED[0] = 0x24;
    this.dataLED[1] = this.sendCommand | 0x03;
    this.dataLED[2] = this.intensidad;
    this.dataLED[3] = (this.dataLED[0]+this.dataLED[1]+this.dataLED[2])%256;
    this.setData(this.dataLED);
  }

  sendDutty(){
    this.dataMotor[0] = 0x24;
    this.dataMotor[1] = this.sendCommand | 0x02;
    this.dataMotor[2] = this.porcentaje;
    this.dataMotor[3] = (this.dataMotor[0]+this.dataMotor[1]+this.dataMotor[2])%256;
    this.setData(this.dataMotor);
  }

  getVariables(){
    if (this.toggleVariable) {
      this.toggleVariable = !this.toggleVariable;
      this.getLuminosity();
    } else {
      this.toggleVariable = !this.toggleVariable;
      this.getTemperature();
    }
  }

  getLuminosity(){
    if (this.avaliableLuminosity) {
      var dataLuminosity = new Uint8Array(4);
      dataLuminosity[0] = 0x24;
      dataLuminosity[1] = this.getCommand | 0x01;
      dataLuminosity[2] = 0x00;
      dataLuminosity[3] = (dataLuminosity[0]+dataLuminosity[1]+dataLuminosity[2])%256;
      this.setData(dataLuminosity);
      this.avaliableLuminosity = false;
    }

    setTimeout(() => {
      this.bluetoothSerial.read().then(
        (data)=>{
          if (data.length == 4) {
            if (data[0]=='$') {
              if ((data[0].charCodeAt(0)+data[1].charCodeAt(0)+data[2].charCodeAt(0))%128==data[3].charCodeAt(0)) {
                this.luminosidad = data[2].charCodeAt(0);
                this.bluetoothSerial.clear();
                this.avaliableLuminosity = true;
              }
            }
          }
        }
      );
    }, 500);
  }

  getTemperature(){
    if (this.avaliableTemperature){
      var dataTemperature = new Uint8Array(4);
      dataTemperature[0] = 0x24;
      dataTemperature[1] = this.getCommand | 0x00;
      dataTemperature[2] = 0x00;
      dataTemperature[3] = (dataTemperature[0]+dataTemperature[1]+dataTemperature[2])%256;
      this.setData(dataTemperature);
      this.avaliableTemperature = false;
    }
    setTimeout(() => {
      this.bluetoothSerial.read().then(
        (data)=>{
          if (data.length == 4) {
            if (data[0]=='$') {
              if ((data[0].charCodeAt(0)+data[1].charCodeAt(0)+data[2].charCodeAt(0))%128==data[3].charCodeAt(0)) {
                this.temperatura = data[2].charCodeAt(0);
                this.bluetoothSerial.clear();
                this.avaliableTemperature = true;
              }
            }
          }
        }
      );
    }, 500);
  }


  bluetoothState(){
    this.bluetoothSerial.isEnabled().then(
      () => {
        this.isConnected();
      },() => {
        this.showBluetoothSettings();
      }
    );
  }

  showBluetoothSettings(){
    this.bluetoothSerial.showBluetoothSettings().then(
      ()=>{
        this.isConnected();
      },
      () => {
        console.log('Encienda el bluetooth');
      }
    )
  }

  isConnected(){
    this.bluetoothSerial.isConnected().then(
      ()=>{
        this.isNotConnected = false;
      },
      () => {
        this.isNotConnected = true;
        this.listDevices();
      }
    );
  }

  listDevices(){
    this.bluetoothSerial.list().then(
      (response) => {
        this.devices = response;
      },
      () => {
        console.log('No se pudo listar los dispositivos');
      }
    );
  }

  connect(address){
    this.bluetoothSerial.isEnabled().then(
      () => {
        this.bluetoothSerial.isConnected().then(
          ()=>{
            this.closeConnection();
          },
          () => {
            this.bluetoothSerial.connect(address).subscribe(
              () =>{
                this.isNotConnected = false;
                this.avaliableTemperature = true;
                this.avaliableLuminosity = true;
              },
              ()=>{
                this.isNotConnected = true;
              }
            );
          }
        );
      },() => {
        this.showBluetoothSettings();
      }
    );
  }

  setData(data) {
    this.bluetoothSerial.write(data).then(
      () => {
        console.log('Mensaje enviado exitosamente');
      },
      () => {
        console.log('Mensaje no pudo ser enviado');
      }
    );
  }

  closeConnection(){
    this.bluetoothSerial.disconnect();
    this.bluetoothState();
  }

  async isEnabled(msg){
    const alert= await this.alertControler.create({
      header: 'Alerta',
      message: msg,
      buttons: [{
        text:"Ok"
      }]
    })
  }

}
