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
    this.uuid = UUIDGen.generate(this.name);
    this.startTime = new Date();
    this.stopTime = this.startTime
    this.remaining = this.delay
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

    if (!on) {
        this.log('Stopping the Timer');

        this.switchOn = false;
        clearInterval(this.timer);
        this.motionTriggered = false;
        if (!this.disableSensor) this.motionService.getCharacteristic(Characteristic.MotionDetected).updateValue(false);
        this.stopTime = new Date();
    } else {
        this.log('Starting the Timer');
        this.switchOn = true;
        var gap = new Date() - this.stopTime
        if (gap > 5000) {
            this.log('Reset timer')
            this.startTime = new Date();
            clearInterval(this.timer);
            this.remaining = this.delay
        }

        this.timer = setInterval(function () {
            this.currentTimer = new Date()
            this.lapse = this.currentTimer - this.startTime
            this.remaining = this.delay - this.lapse
            if (this.lapse > this.remaining) {
                this.log('Time is Up!');
                clearInterval(this.timer)
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
            }
        }.bind(this), 30 * 100);
    }
    callback();
}


delaySwitch.prototype.getOn = function (callback) {
    callback(null, this.switchOn);
}

delaySwitch.prototype.getMotion = function (callback) {
    callback(null, this.motionTriggered);
}
