/*
 * Copyright (c) 2021 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import deviceManager from '@ohos.distributedHardware.deviceManager';

var SUBSCRIBE_ID = 100;

export default class RemoteDeviceModel {
    deviceList: any[] = []
    callback: any
    #deviceManager: any

    constructor() {
    }

    registerDeviceListCallback(callback: any) {
        if (typeof (this.#deviceManager) === 'undefined') {
            console.log('DrawBoard[RemoteDeviceModel] deviceManager.createDeviceManager begin');
            let self = this;
            deviceManager.createDeviceManager('com.ohos.distributedDrawBoard', (error, value) => {
                if (error) {
                    console.error('createDeviceManager failed.');
                    return;
                }
                self.#deviceManager = value;
                self.registerDeviceListCallback_(callback);
                console.log('DrawBoard[RemoteDeviceModel] createDeviceManager callback returned, error=' + error + ' value=' + value);
            });
            console.log('DrawBoard[RemoteDeviceModel] deviceManager.createDeviceManager end');
        } else {
            this.registerDeviceListCallback_(callback);
        }
    }

    registerDeviceListCallback_(callback: any) {
        console.info('DrawBoard[RemoteDeviceModel] registerDeviceListCallback');
        this.callback = callback;
        if (this.#deviceManager == undefined) {
            console.error('DrawBoard[RemoteDeviceModel] deviceManager has not initialized');
            this.callback();
            return;
        }

        console.info('DrawBoard[RemoteDeviceModel] getTrustedDeviceListSync begin');
        var list = this.#deviceManager.getTrustedDeviceListSync();
        console.info('DrawBoard[RemoteDeviceModel] getTrustedDeviceListSync end, deviceList=' + JSON.stringify(list));
        if (typeof (list) != 'undefined' && typeof (list.length) != 'undefined') {
            this.deviceList = list;
        }
        this.callback();
        console.info('DrawBoard[RemoteDeviceModel] callback finished');

        let self = this;
        this.#deviceManager.on('deviceStateChange', (data: any) => {
            console.info('DrawBoard[RemoteDeviceModel] deviceStateChange data=' + JSON.stringify(data));
            switch (data.action) {
                case 0:
                    self.deviceList[self.deviceList.length] = data.device;
                    console.info('DrawBoard[RemoteDeviceModel] online, updated device list=' + JSON.stringify(self.deviceList));
                    self.callback();
                    break;
                case 2:
                    if (self.deviceList.length > 0) {
                        for (var i = 0; i < self.deviceList.length; i++) {
                            if (self.deviceList[i].deviceId === data.device.deviceId) {
                                self.deviceList[i] = data.device;
                                break;
                            }
                        }
                    }
                    console.info('DrawBoard[RemoteDeviceModel] change, updated device list=' + JSON.stringify(self.deviceList));
                    self.callback();
                    break;
                case 1:
                    if (self.deviceList.length > 0) {
                        var list = [];
                        for (var i = 0; i < self.deviceList.length; i++) {
                            if (self.deviceList[i].deviceId != data.device.deviceId) {
                                list[i] = data.device;
                            }
                        }
                        self.deviceList = list;
                    }
                    console.info('DrawBoard[RemoteDeviceModel] offline, updated device list=' + JSON.stringify(data.device));
                    self.callback();
                    break;
                default:
                    break;
            }
        });
        this.#deviceManager.on('deviceFound', (data: any) => {
            console.info('DrawBoard[RemoteDeviceModel] deviceFound data=' + JSON.stringify(data));
            console.info('DrawBoard[RemoteDeviceModel] deviceFound self.deviceList=' + self.deviceList);
            console.info('DrawBoard[RemoteDeviceModel] deviceFound self.deviceList.length=' + self.deviceList.length);
            for (var i = 0; i < self.deviceList.length; i++) {
                if (self.deviceList[i].deviceId === data.device.deviceId) {
                    console.info('DrawBoard[RemoteDeviceModel] device founded, ignored');
                    return;
                }
            }

            console.info('DrawBoard[RemoteDeviceModel] authenticateDevice ' + JSON.stringify(data.device));
            self.#deviceManager.authenticateDevice(data.device);
        });
        this.#deviceManager.on('discoverFail', (data: any) => {
            console.info('DrawBoard[RemoteDeviceModel] discoverFail data=' + JSON.stringify(data));
        });
        this.#deviceManager.on('authResult', (data: any) => {
            console.info('DrawBoard[RemoteDeviceModel] authResult data=' + JSON.stringify(data));
        });
        this.#deviceManager.on('serviceDie', () => {
            console.error('DrawBoard[RemoteDeviceModel] serviceDie');
        });

        SUBSCRIBE_ID = Math.floor(65536 * Math.random());
        var info = {
            subscribeId: SUBSCRIBE_ID,
            mode: 0xAA,
            medium: 2,
            freq: 2,
            isSameAccount: false,
            isWakeRemote: true,
            capability: 0
        };
        console.info('DrawBoard[RemoteDeviceModel] startDeviceDiscovery ' + SUBSCRIBE_ID);
        this.#deviceManager.startDeviceDiscovery(info);
    }

    unregisterDeviceListCallback() {
        console.info('DrawBoard[RemoteDeviceModel] stopDeviceDiscovery ' + SUBSCRIBE_ID);
        this.#deviceManager.stopDeviceDiscovery(SUBSCRIBE_ID);
        this.#deviceManager.off('deviceStateChange');
        this.#deviceManager.off('deviceFound');
        this.#deviceManager.off('discoverFail');
        this.#deviceManager.off('authResult');
        this.#deviceManager.off('serviceDie');
        this.deviceList = [];
    }
}