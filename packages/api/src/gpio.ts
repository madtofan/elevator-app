/** GPIO pins are numbered with the BCM scheme used by both `onoff` and sysfs. */
export const GPIO_INPUT_PIN = 17;
export const GPIO_OUTPUT_PIN = 27;

export type GpioState = 0 | 1;

export type GpioChangeEvent = {
	pin: number;
	state: GpioState;
	timestamp: string;
};

/** Normalizes a SQLite integer column (checked to be 0 or 1) to `GpioState`. */
export function toGpioState(value: number): GpioState {
	return value === 1 ? 1 : 0;
}
