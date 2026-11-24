
package com.aldairone.mobile

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import io.livekit.android.LiveKit
import io.livekit.android.room.Room
import kotlinx.coroutines.launch
import okhttp3.*
import org.json.JSONObject
import java.io.IOException

class LiveClassActivity : AppCompatActivity() {

    private val apiBase = "https://astech-l7vb.onrender.com/api"
    private val client = OkHttpClient()

    private lateinit var room: Room
    private lateinit var statusText: TextView

    private var connected = false

    private val permissionsLauncher =
        registerForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions()
        ) { permissions ->

            val audioGranted =
                permissions[Manifest.permission.RECORD_AUDIO] == true

            val cameraGranted =
                permissions[Manifest.permission.CAMERA] == true

            if (audioGranted && cameraGranted) {
                requestRoomToken()
            } else {
                statusText.text =
                    "Precisamos das permissões de câmara e microfone."
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        createInterface()

        val sessionId = intent.getStringExtra("sessionId")

        if (sessionId.isNullOrBlank()) {
            statusText.text = "Identificador da aula inválido."
            return
        }

        checkPermissionsAndConnect(sessionId)
    }

    private fun createInterface() {

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(24, 30, 24, 30)
            setBackgroundColor(Color.rgb(10, 16, 32))
        }

        val title = TextView(this).apply {
            text = "ALDAIR ONE"
            textSize = 27f
            setTextColor(Color.WHITE)
            setTypeface(null, android.graphics.Typeface.BOLD)
            gravity = Gravity.CENTER
        }

        root.addView(title)

        val subtitle = TextView(this).apply {
            text = "Sala de Aula Online"
            textSize = 19f
            setTextColor(Color.rgb(48, 126, 255))
            gravity = Gravity.CENTER
            setPadding(0, 12, 0, 25)
        }

        root.addView(subtitle)

        statusText = TextView(this).apply {
            text = "A preparar a sala..."
            textSize = 15f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setPadding(12, 20, 12, 20)
        }

        root.addView(statusText)

        addControlButton(
            root,
            "Desligar microfone"
        ) {
            lifecycleScope.launch {
                if (connected) {
                    room.localParticipant.setMicrophoneEnabled(false)
                    statusText.text = "Microfone desligado."
                }
            }
        }

        addControlButton(
            root,
            "Ligar microfone"
        ) {
            lifecycleScope.launch {
                if (connected) {
                    room.localParticipant.setMicrophoneEnabled(true)
                    statusText.text = "Microfone ligado."
                }
            }
        }

        addControlButton(
            root,
            "Desligar câmara"
        ) {
            lifecycleScope.launch {
                if (connected) {
                    room.localParticipant.setCameraEnabled(false)
                    statusText.text = "Câmara desligada."
                }
            }
        }

        addControlButton(
            root,
            "Ligar câmara"
        ) {
            lifecycleScope.launch {
                if (connected) {
                    room.localParticipant.setCameraEnabled(true)
                    statusText.text = "Câmara ligada."
                }
            }
        }

        addControlButton(
            root,
            "Sair da aula"
        ) {
            if (::room.isInitialized) {
                lifecycleScope.launch {
                    room.disconnect()
                    finish()
                }
            } else {
                finish()
            }
        }

        setContentView(root)
    }

    private fun addControlButton(
        parent: LinearLayout,
        label: String,
        action: () -> Unit
    ) {

        val button = Button(this).apply {
            text = label
            isAllCaps = false
            setTextColor(Color.WHITE)

            background = GradientDrawable().apply {
                setColor(Color.rgb(36, 75, 130))
                cornerRadius = 18f
            }

            setOnClickListener {
                action()
            }
        }

        val params = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            58
        )

        params.setMargins(0, 7, 0, 7)

        parent.addView(button, params)
    }

    private fun checkPermissionsAndConnect(sessionId: String) {

        val audioGranted =
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED

        val cameraGranted =
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED

        if (audioGranted && cameraGranted) {
            requestRoomToken()
        } else {
            permissionsLauncher.launch(
                arrayOf(
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.CAMERA
                )
            )
        }
    }

    private fun requestRoomToken() {

        statusText.text = "A validar o teu acesso à aula..."

        val sessionId = intent.getStringExtra("sessionId")
            ?: return

        val token = getSharedPreferences(
            "aldair_one",
            Context.MODE_PRIVATE
        ).getString("token", null)

        if (token.isNullOrBlank()) {
            statusText.text = "Sessão expirada. Volta a entrar."
            return
        }

        val request = Request.Builder()
            .url("$apiBase/livekit/sessions/$sessionId/token")
            .header("Authorization", "Bearer $token")
            .post(
                RequestBody.create(
                    null,
                    ByteArray(0)
                )
            )
            .build()

        client.newCall(request).enqueue(object : Callback {

            override fun onFailure(
                call: Call,
                e: IOException
            ) {
                runOnUiThread {
                    statusText.text =
                        "Não foi possível contactar o servidor."
                }
            }

            override fun onResponse(
                call: Call,
                response: Response
            ) {

                val responseText =
                    response.body()?.string().orEmpty()

                try {
                    val json = JSONObject(responseText)

                    if (!response.isSuccessful ||
                        !json.optBoolean("success")
                    ) {
                        runOnUiThread {
                            statusText.text =
                                json.optString(
                                    "message",
                                    "Acesso à sala recusado."
                                )
                        }
                        return
                    }

                    val connection =
                        json.getJSONObject("connection")

                    val serverUrl =
                        connection.getString("serverUrl")

                    val participantToken =
                        connection.getString("token")

                    runOnUiThread {
                        connectToLiveKit(
                            serverUrl,
                            participantToken
                        )
                    }

                } catch (e: Exception) {
                    runOnUiThread {
                        statusText.text =
                            "Não foi possível validar o acesso."
                    }
                }
            }
        })
    }

    private fun connectToLiveKit(
        serverUrl: String,
        participantToken: String
    ) {

        statusText.text = "A ligar à sala..."

        room = LiveKit.create(applicationContext)

        lifecycleScope.launch {

            try {

                room.connect(
                    serverUrl,
                    participantToken
                )

                room.localParticipant.setMicrophoneEnabled(true)
                room.localParticipant.setCameraEnabled(true)

                connected = true

                statusText.text =
                    "Estás ligado à sala! Microfone e câmara preparados."

            } catch (error: Exception) {

                connected = false

                statusText.text =
                    "Erro ao entrar na sala: ${error.message}"

            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()

        if (::room.isInitialized) {
            lifecycleScope.launch {
                room.disconnect()
                room.release()
            }
        }
    }
}
