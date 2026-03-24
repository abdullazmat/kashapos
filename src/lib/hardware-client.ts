/**
 * Hardware Client for POS
 * Handles raw ESC/POS commands via Web Serial API
 */

const SERIAL_PORT_KEY = "kashapos-printer-port";

export async function openCashDrawer() {
  // ESC/POS command to open drawer: ESC p m t1 t2
  // p: 112 (hex 0x70)
  // m: 0 for pin 2, 1 for pin 5
  // t1, t2: 25, 250 (pulse time)
  const command = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);

  if (typeof window === "undefined") return;

  if (!("serial" in navigator)) {
    throw new Error("Web Serial API is not supported in this browser. Please use Chrome, Edge, or a compatible browser.");
  }

  try {
    // Check if we already have a port authorized
    const ports = await (navigator as any).serial.getPorts();
    let port = ports[0];

    if (!port) {
      // Request user to pick a port
      port = await (navigator as any).serial.requestPort();
    }

    await port.open({ baudRate: 9600 });
    const writer = port.writable.getWriter();
    await writer.write(command);
    
    // Release and close
    writer.releaseLock();
    await port.close();
    
    return true;
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      throw new Error("No printer found or selected.");
    }
    if (err.name === 'InvalidStateError') {
      throw new Error("Printer port is already open.");
    }
    throw err;
  }
}

/**
 * Fallback / Alternative: Standard print-based trigger
 * Some printer drivers open the drawer on every print.
 * This sends a 1x1 pixel hidden print job.
 */
export function openDrawerViaPrint() {
  const printWindow = window.open("", "_blank", "width=1,height=1");
  if (!printWindow) return false;

  printWindow.document.write('<html><body style="margin:0;padding:0;overflow:hidden;"><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="width:1px;height:1px;"></body></html>');
  printWindow.document.close();
  
  window.setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
  
  return true;
}
