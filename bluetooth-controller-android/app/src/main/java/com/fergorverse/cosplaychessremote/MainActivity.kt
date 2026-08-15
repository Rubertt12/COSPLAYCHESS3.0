package com.fergorverse.cosplaychessremote

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothHidDevice
import android.bluetooth.BluetoothHidDeviceAppSdpSettings
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {
    private lateinit var adapter: BluetoothAdapter
    private var hid: BluetoothHidDevice? = null
    private var connectedHost: BluetoothDevice? = null
    private var bondedHosts: List<BluetoothDevice> = emptyList()

    private lateinit var statusText: TextView
    private lateinit var hostSpinner: Spinner
    private val handler = Handler(Looper.getMainLooper())

    private val keyboardDescriptor = byteArrayOf(
        0x05, 0x01,       // Usage Page (Generic Desktop)
        0x09, 0x06,       // Usage (Keyboard)
        0xA1.toByte(), 0x01, // Collection (Application)
        0x05, 0x07,       // Usage Page (Keyboard)
        0x19, 0xE0.toByte(), // Usage Minimum (Left Control)
        0x29, 0xE7.toByte(), // Usage Maximum (Right GUI)
        0x15, 0x00,
        0x25, 0x01,
        0x75, 0x01,
        0x95.toByte(), 0x08,
        0x81.toByte(), 0x02, // Input (Data,Var,Abs) modifiers
        0x95.toByte(), 0x01,
        0x75, 0x08,
        0x81.toByte(), 0x01, // Reserved byte
        0x95.toByte(), 0x06,
        0x75, 0x08,
        0x15, 0x00,
        0x25, 0x73,       // Keyboard usage up to F24
        0x05, 0x07,
        0x19, 0x00,
        0x29, 0x73,
        0x81.toByte(), 0x00,
        0xC0.toByte()
    )

    private val callback = object : BluetoothHidDevice.Callback() {
        override fun onAppStatusChanged(pluggedDevice: BluetoothDevice?, registered: Boolean) {
            runOnUiThread {
                statusText.text = if (registered) {
                    "Controle Bluetooth pronto. Escolha o PC pareado."
                } else {
                    "Não foi possível registrar o controle HID."
                }
                refreshBondedHosts()
            }
        }

        override fun onConnectionStateChanged(device: BluetoothDevice?, state: Int) {
            runOnUiThread {
                when (state) {
                    BluetoothProfile.STATE_CONNECTED -> {
                        connectedHost = device
                        statusText.text = "Conectado ao PC: ${safeDeviceName(device)}"
                    }
                    BluetoothProfile.STATE_CONNECTING -> statusText.text = "Conectando ao PC..."
                    BluetoothProfile.STATE_DISCONNECTING -> statusText.text = "Desconectando..."
                    else -> {
                        if (connectedHost?.address == device?.address) connectedHost = null
                        statusText.text = "Bluetooth pronto. Conecte ao PC para controlar o CosplayChess."
                    }
                }
            }
        }
    }

    private val serviceListener = object : BluetoothProfile.ServiceListener {
        override fun onServiceConnected(profile: Int, proxy: BluetoothProfile?) {
            if (profile != BluetoothProfile.HID_DEVICE) return
            hid = proxy as? BluetoothHidDevice
            registerHidApp()
        }

        override fun onServiceDisconnected(profile: Int) {
            if (profile == BluetoothProfile.HID_DEVICE) {
                hid = null
                connectedHost = null
                runOnUiThread { statusText.text = "Serviço Bluetooth desconectado." }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val manager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        adapter = manager.adapter
        setContentView(buildUi())
        ensureBluetoothPermissionAndStart()
    }

    private fun buildUi(): ScrollView {
        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(22), dp(18), dp(24))
        }

        root.addView(TextView(this).apply {
            text = "COSPLAYCHESS REMOTE"
            textSize = 25f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dp(6))
        })
        root.addView(TextView(this).apply {
            text = "Controle 100% offline por Bluetooth"
            gravity = Gravity.CENTER
            alpha = 0.7f
            setPadding(0, 0, 0, dp(18))
        })

        statusText = TextView(this).apply {
            text = "Preparando Bluetooth..."
            setPadding(dp(12), dp(12), dp(12), dp(12))
        }
        root.addView(statusText, matchWrap())

        hostSpinner = Spinner(this)
        root.addView(hostSpinner, matchWrap())

        root.addView(Button(this).apply {
            text = "CONECTAR AO PC SELECIONADO"
            setOnClickListener { connectSelectedHost() }
        }, matchWrap())

        root.addView(TextView(this).apply {
            text = "ÁUDIO"
            textSize = 14f
            setPadding(0, dp(20), 0, dp(6))
        })
        root.addView(buttonRow(
            controlButton("▶ AMBIENTE", 0x68),
            controlButton("■ PARAR", 0x69)
        ))
        root.addView(buttonRow(
            controlButton("VOL −", 0x6C),
            controlButton("VOL +", 0x6D)
        ))
        root.addView(controlButton("⛔ PARAR TODOS OS SONS", 0x6E), matchWrap())

        root.addView(TextView(this).apply {
            text = "PARTIDA"
            textSize = 14f
            setPadding(0, dp(20), 0, dp(6))
        })
        root.addView(buttonRow(
            controlButton("⚔ INICIAR", 0x6A),
            controlButton("⏸ PAUSAR", 0x6B)
        ))
        root.addView(buttonRow(
            controlButton("🎲 SORTEAR", 0x6F),
            controlButton("↶ DESFAZER", 0x70)
        ))
        root.addView(controlButton("☰ ABRIR / FECHAR MENU", 0x71), matchWrap())

        root.addView(TextView(this).apply {
            text = "O celular funciona como um controle HID Bluetooth. Não usa internet, Wi‑Fi, Supabase ou rede local. O PC precisa estar pareado por Bluetooth e com o CosplayChess experimental aberto."
            alpha = 0.65f
            textSize = 12f
            setPadding(0, dp(22), 0, 0)
        })

        scroll.addView(root)
        return scroll
    }

    private fun buttonRow(vararg buttons: Button): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        buttons.forEach { button ->
            addView(button, LinearLayout.LayoutParams(0, dp(58), 1f).apply {
                marginEnd = dp(6)
                topMargin = dp(4)
            })
        }
    }

    private fun controlButton(label: String, usage: Int): Button = Button(this).apply {
        text = label
        isAllCaps = false
        setOnClickListener { sendKey(usage) }
    }

    private fun ensureBluetoothPermissionAndStart() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.BLUETOOTH_CONNECT), 700)
            return
        }
        startHidProfile()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 700 && grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) {
            startHidProfile()
        } else if (requestCode == 700) {
            statusText.text = "Permissão Bluetooth negada. O controle não pode conectar ao PC."
        }
    }

    private fun startHidProfile() {
        if (!hasConnectPermission()) return
        if (!adapter.isEnabled) {
            statusText.text = "Ative o Bluetooth do celular e abra o app novamente."
            return
        }
        statusText.text = "Registrando controle Bluetooth..."
        adapter.getProfileProxy(this, serviceListener, BluetoothProfile.HID_DEVICE)
    }

    private fun registerHidApp() {
        if (!hasConnectPermission()) return
        val settings = BluetoothHidDeviceAppSdpSettings(
            "CosplayChess Remote",
            "Controle offline Fergorverse para CosplayChess",
            "Fergorverse",
            BluetoothHidDevice.SUBCLASS1_KEYBOARD,
            keyboardDescriptor
        )
        hid?.registerApp(settings, null, null, mainExecutor, callback)
    }

    private fun refreshBondedHosts() {
        if (!hasConnectPermission()) return
        bondedHosts = adapter.bondedDevices
            .filter { it.bluetoothClass?.majorDeviceClass == android.bluetooth.BluetoothClass.Device.Major.COMPUTER || it.name?.isNotBlank() == true }
            .sortedBy { safeDeviceName(it).lowercase() }
        val labels = if (bondedHosts.isEmpty()) {
            listOf("Nenhum dispositivo pareado")
        } else {
            bondedHosts.map { "${safeDeviceName(it)} • ${it.address}" }
        }
        hostSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, labels)
    }

    private fun connectSelectedHost() {
        if (!hasConnectPermission()) return
        if (bondedHosts.isEmpty()) {
            statusText.text = "Pareie primeiro o celular com o PC nas configurações de Bluetooth do Android/Windows."
            return
        }
        val index = hostSpinner.selectedItemPosition.coerceIn(0, bondedHosts.lastIndex)
        val host = bondedHosts[index]
        statusText.text = "Conectando a ${safeDeviceName(host)}..."
        hid?.connect(host)
    }

    private fun sendKey(usage: Int) {
        if (!hasConnectPermission()) return
        val host = connectedHost
        val device = hid
        if (host == null || device == null) {
            statusText.text = "Conecte o controle ao PC antes de enviar comandos."
            return
        }

        val pressed = byteArrayOf(0, 0, usage.toByte(), 0, 0, 0, 0, 0)
        val released = ByteArray(8)
        val sent = device.sendReport(host, 0, pressed)
        handler.postDelayed({
            if (hasConnectPermission()) hid?.sendReport(host, 0, released)
        }, 45)
        statusText.text = if (sent) "Comando enviado ✓" else "Falha ao enviar comando Bluetooth."
    }

    private fun safeDeviceName(device: BluetoothDevice?): String {
        if (device == null || !hasConnectPermission()) return "PC"
        return device.name ?: "Dispositivo Bluetooth"
    }

    private fun hasConnectPermission(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED

    private fun matchWrap() = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    override fun onDestroy() {
        if (hasConnectPermission()) {
            try { hid?.unregisterApp() } catch (_: Exception) {}
            try { hid?.let { adapter.closeProfileProxy(BluetoothProfile.HID_DEVICE, it) } } catch (_: Exception) {}
        }
        super.onDestroy()
    }
}
