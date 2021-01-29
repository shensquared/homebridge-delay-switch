var Service, Characteristic;

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-delay-switch", "DelaySwitch", delaySwitch);
}


function delaySwitch(log, config, api) {
    let UUIDGen = api.hap.uuid;

    this.log = log;
    this.name = config['name'];
    this.delay = config['delay'];
    this.disableSensor = config['disableSensor'] || false;
    this.startOnReboot = config['startOnReboot'] || false;
    this.timer;
    this.switchOn = false;
    this.motionTriggered = false;
    this.uuid = UUIDGen.generate(this.name)
    this.startTime = new Date();
}

delaySwitch.prototype.getServices = function () {
    var informationService = new Service.AccessoryInformation();

    informationService
        .setCharacteristic(Characteristic.Manufacturer, "Delay Switch")
        .setCharacteristic(Characteristic.Model, `Delay-${this.delay}ms`)
        .setCharacteristic(Characteristic.SerialNumber, this.uuid);


    this.switchService = new Service.Switch(this.name);


    this.switchService.getCharacteristic(Characteristic.On)
        .on('get', this.getOn.bind(this))
        .on('set', this.setOn.bind(this));

    if (this.startOnReboot)
        this.switchService.setCharacteristic(Characteristic.On, true)

    var services = [informationService, this.switchService]

    if (!this.disableSensor) {
        this.motionService = new Service.MotionSensor(this.name + ' Trigger');

        this.motionService
            .getCharacteristic(Characteristic.MotionDetected)
            .on('get', this.getMotion.bind(this));
        services.push(this.motionService)
    }

    return services;

}


delaySwitch.prototype.setOn = function (on, callback) {
    var currentTime = new Date();
    var timeDiff = currentTime - this.startTime;

    if (!on) {
        if (timeDiff > 10) {
            this.log('Stopping the Timer');
            this.switchOn = false;
            clearTimeout(this.timer);
            this.startTime = new Date();
            this.motionTriggered = false;
            if (!this.disableSensor) this.motionService.getCharacteristic(Characteristic.MotionDetected).updateValue(false);
        }
    } else {
        this.startTime = new Date();
        if (timeDiff>10) {
            this.log('Starting the Timer');
            this.switchOn = true;

            clearTimeout(this.timer);
            this.timer = setTimeout(function () {
                this.log('Time is Up!');
                this.startTime = new Date();
                this.switchService.getCharacteristic(Characteristic.On).updateValue(false);
                this.switchOn = false;

                if (!this.disableSensor) {
                    this.motionTriggered = true;
                    this.motionService.getCharacteristic(Characteristic.MotionDetected).updateValue(true);
                    this.log('Triggering Motion Sensor');
                    setTimeout(function () {
                        this.motionService.getCharacteristic(Characteristic.MotionDetected).updateValue(false);
                        this.motionTriggered = false;
                    }.bind(this), 3000);
                }

            }.bind(this), this.delay);
        }
    }

    callback();
}


delaySwitch.prototype.getOn = function (callback) {
    callback(null, this.switchOn);
}

delaySwitch.prototype.getMotion = function (callback) {
    callback(null, this.motionTriggered);
}

$("input#button").click(function () {
    startTime = new Date();
    setTimeout(display, 1000);
});



