import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { BluetoothSerial } from '@ionic-native/bluetooth-serial/ngx';
import { AlertController } from '@ionic/angular';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements AfterViewInit {

  constructor(private bluetoothSerial: BluetoothSerial, private alertControler: AlertController) { }
  @ViewChild('errorGraph') private errorGraph: ElementRef;
  @ViewChild('rpmGraph') private rpmGraph: ElementRef;
  @ViewChild('twoLinesGraph') private twoLinesGraph: ElementRef;
  @ViewChild('desiredRPMGraph') private desiredRPMGraph: ElementRef;
  barErrorChart: any;
  barRPMChart: any;
  twoLinesChart: any;
  barDesiredRPMChart:any;
  setPoint = 50;
  Kc: string = '0';
  Ti: string = '0';
  lazo = false;
  sendCommand = 0x80;
  getCommand = 0x00;
  data = new Uint8Array(2);
  counter = 0;
  isNotConnected: Boolean = true;
  devices = [];
  dataReceived = [];
  inputData: string = '';
  firstTime: boolean = true;
  measuredRPM = 0;
  microSetPoint = 0;
  rpmArray = new Array(100);
  spArray = new Array(100);
  error = 50;
  xAxis = new Array(100);
  counterOf500ms = 0;

  ngAfterViewInit(): void {
    this.bluetoothState();
    this.bluetoothSerial.clear();
    this.rpmArray.fill(0, 0, 99);
    this.spArray.fill(0, 0, 99);
    this.fullXAxis();
    this.setGraphs();
    setInterval(()=>{this.checkValue();}, 500);
  }

  checkValue(){
    console.log(this.isNotConnected);
  }
  fullXAxis() {
    let acum = 0;
    for (let index = 0; index < 100; index++) {
      this.xAxis[index] = acum.toString();
      acum = acum + 0.5;
    }
  }
  setGraphs() {
    const ctx = this.errorGraph.nativeElement;
    const errorData = {
      label: 'Error (%)',
      data: [this.error]
    };

    this.barErrorChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Error'],
        datasets: [errorData]
      }
    });
    const ctx1 = this.rpmGraph.nativeElement;
    const rpmData = {
      label: 'RPM sensado',
      data: [this.measuredRPM]
    };

    this.barRPMChart = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: ['RPM sensado'],
        datasets: [rpmData]
      }
    });

    const ctx3 = this.desiredRPMGraph.nativeElement;
    const desiredRPMData = {
      label: 'RPM deseados',
      data: [this.microSetPoint]
    };

    this.barDesiredRPMChart = new Chart(ctx3, {
      type: 'bar',
      data: {
        labels: ['Velocidad deseada'],
        datasets: [desiredRPMData]
      }
    });

    const ctx2 = this.twoLinesGraph.nativeElement;
    const dataFirst = {
      label: 'RPM sensado',
      data: this.rpmArray,
      lineTension: 0,
      fill: false,
      borderColor: 'red'
    };

    const dataSecond = {
      label: 'Set point',
      data: this.spArray,
      lineTension: 0,
      fill: false,
      borderColor: 'blue'
    };

    const speedData = {
      labels: this.xAxis,
      datasets: [dataFirst, dataSecond]
    };

    this.twoLinesChart = new Chart(ctx2, {
      type: 'line',
      data: speedData
    });

  }

  sendTi() {
    var patt = new RegExp('^([0-9]+)\.([0-9]+)$');
    if (patt.test(this.Kc)) {
      let dataControl = new Uint8Array(this.Ti.length + 2);
      dataControl[0] = 0x33;
      for (let i = 0; i < this.Ti.length; i++) {
        dataControl[i + 1] = this.Ti[i].charCodeAt(0);
      }
      dataControl[this.Ti.length + 1] = '$'.charCodeAt(0);
      this.setData(dataControl);
    }
  }

  sendSetPoint() {
    this.data[0] = (this.lazo) ? 0x31 : 0x30;
    this.data[1] = this.setPoint;
    this.setData(this.data);
    if (this.firstTime) {
      setInterval(() => { this.getVariables(); }, 500);
      this.firstTime = false;
    }
  }

  sendKc() {
    var patt = new RegExp('^([0-9]+)\.([0-9]+)$');
    if (patt.test(this.Kc)) {
      let dataControl = new Uint8Array(this.Kc.length + 2);
      dataControl[0] = 0x32;
      for (let i = 0; i < this.Kc.length; i++) {
        dataControl[i + 1] = this.Kc[i].charCodeAt(0);
      }
      dataControl[this.Kc.length + 1] = '$'.charCodeAt(0);
      this.setData(dataControl);
    }
  }

  getVariables() {
    this.bluetoothSerial.read().then(
      (data) => {
        this.inputData = data;
        this.bluetoothSerial.clear();
        this.obtainRPMAndSetPoint(this.inputData);
      });
  }

  obtainRPMAndSetPoint(dataToProcess) {
    let counter = 0;
    while (counter < dataToProcess.length) {
      if (dataToProcess[counter] === 's') {
        if (counter + 6 < dataToProcess.length) {
          if (dataToProcess[counter + 6] === 'r') {
            if (counter + 11 < dataToProcess.length) {
              this.microSetPoint = 0;
              this.measuredRPM = 0;
              this.microSetPoint = (dataToProcess[counter + 1].charCodeAt(0) - 48) * 1;
              this.microSetPoint += (dataToProcess[counter + 2].charCodeAt(0) - 48) * 10;
              this.microSetPoint += (dataToProcess[counter + 3].charCodeAt(0) - 48) * 100;
              this.microSetPoint += (dataToProcess[counter + 4].charCodeAt(0) - 48) * 1000;
              this.microSetPoint += (dataToProcess[counter + 5].charCodeAt(0) - 48) * 10000;
              this.measuredRPM = (dataToProcess[counter + 7].charCodeAt(0) - 48) * 1;
              this.measuredRPM += (dataToProcess[counter + 8].charCodeAt(0) - 48) * 10;
              this.measuredRPM += (dataToProcess[counter + 9].charCodeAt(0) - 48) * 100;
              this.measuredRPM += (dataToProcess[counter + 10].charCodeAt(0) - 48) * 1000;
              this.measuredRPM += (dataToProcess[counter + 11].charCodeAt(0) - 48) * 10000;
              this.error = (100 * (this.measuredRPM - this.microSetPoint)) / this.microSetPoint;
              if (this.error < 0) {
                this.error = this.error * (-1);
              }
              this.updateQueue();
              this.barErrorChart.data.datasets[0].data[0] = this.error;
              this.barErrorChart.update();
              if (this.counterOf500ms === 2) {
                this.barRPMChart.data.datasets[0].data[0] = this.measuredRPM;
                this.barRPMChart.update();
                this.counterOf500ms = 0;
              }
              this.counterOf500ms++;

              this.barDesiredRPMChart.data.datasets[0].data[0] = this.microSetPoint;
              this.barDesiredRPMChart.update();

              this.twoLinesChart.data.datasets[0].data = this.rpmArray;
              this.twoLinesChart.data.datasets[1].data = this.spArray;
              this.twoLinesChart.update();
              break;
            }
          }
        }
      }
      counter++;
    }
  }

  updateQueue() {
    let tempArray = this.rpmArray.slice(0, 98);
    let newValue = [this.measuredRPM];
    this.rpmArray = newValue.concat(tempArray);

    tempArray = this.spArray.slice(0, 98);
    newValue = [this.microSetPoint];
    this.spArray = newValue.concat(tempArray);
  }

  bluetoothState() {
    this.bluetoothSerial.isEnabled().then(
      () => {
        this.isConnected();
      }, () => {
        this.showBluetoothSettings();
      }
    );
  }

  showBluetoothSettings() {
    this.bluetoothSerial.showBluetoothSettings().then(
      () => {
        this.isConnected();
      },
      () => {
        console.log('Encienda el bluetooth');
      }
    )
  }

  isConnected() {
    this.bluetoothSerial.isConnected().then(
      () => {
        this.isNotConnected = false;
      },
      () => {
        this.isNotConnected = true;
        this.listDevices();
      }
    );
  }

  listDevices() {
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

  closeConnection() {
    this.bluetoothSerial.disconnect();
    this.bluetoothState();
  }

  async isEnabled(msg) {
    const alert = await this.alertControler.create({
      header: 'Alerta',
      message: msg,
      buttons: [{
        text: "Ok"
      }]
    })
  }

}
