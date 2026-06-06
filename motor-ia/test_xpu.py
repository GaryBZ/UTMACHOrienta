import tensorflow as tf
import intel_extension_for_tensorflow as itex

# Forzar a TensorFlow a listar los dispositivos físicos
dispositivos_xpu = tf.config.list_physical_devices('XPU')
dispositivos_cpu = tf.config.list_physical_devices('CPU')

print("--- Resumen de Hardware Detectado ---")
print(f"CPUs detectadas: {len(dispositivos_cpu)}")
print(f"XPUs (GPUs de Intel) detectadas: {len(dispositivos_xpu)}")

if dispositivos_xpu:
    print("\n¡Éxito! Tu Intel Arc B580 está lista para entrenar/inferir.")
    for xpu in dispositivos_xpu:
        print(f"Detalle del dispositivo: {xpu}")
else:
    print("\nError: TensorFlow no detecta la GPU. Revisa la instalación de level-zero.")
