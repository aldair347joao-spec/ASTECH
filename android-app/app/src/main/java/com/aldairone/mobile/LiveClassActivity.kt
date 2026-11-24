package com.aldairone.mobile
import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import io.livekit.android.LiveKit
import io.livekit.android.renderer.SurfaceViewRenderer
import io.livekit.android.room.Room
import io.livekit.android.events.RoomEvent
import io.livekit.android.events.collect
import io.livekit.android.room.track.Track
import io.livekit.android.room.track.LocalVideoTrack
import io.livekit.android.room.track.VideoTrack
import kotlinx.coroutines.launch
import okhttp3.*
import org.json.JSONObject
import java.io.IOException

class LiveClassActivity : AppCompatActivity() {

    private val apiBase =
        "https://astech-l7vb.onrender.com/api"

    private val client = OkHttpClient()

    private lateinit var room: Room

    private lateinit var statusText: TextView
    private lateinit var remoteRenderer: SurfaceViewRenderer
    private lateinit var localRenderer: SurfaceViewRenderer

    private lateinit var remotePlaceholder: TextView
    private lateinit var localPlaceholder: TextView

    private lateinit var microphoneButton: Button
    private lateinit var cameraButton: Button
    private lateinit var leaveButton: Button

    private var connected = false
    private var microphoneEnabled = true
    private var cameraEnabled = true

    private var localVideoTrack: LocalVideoTrack? = null
    private var remoteVideoTrack: VideoTrack? = null

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
                    "Autoriza a câmara e o microfone para entrar na aula."
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentView(R.layout.activity_live_class)

        initializeViews()
        initializeRoom()

        val sessionId = intent.getStringExtra("sessionId")

        if (sessionId.isNullOrBlank()) {
            statusText.text = "Identificador da aula inválido."
            return
        }

        setupButtons()
        checkPermissionsAndConnect()
    }

    private fun initializeViews() {

        statusText = findViewById(R.id.liveClassStatus)

        remoteRenderer =
            findViewById(R.id.remoteVideoRenderer)

        localRenderer =
            findViewById(R.id.localVideoRenderer)

        remotePlaceholder =
            findViewById(R.id.remoteVideoPlaceholder)

        localPlaceholder =
            findViewById(R.id.localVideoPlaceholder)

        microphoneButton =
            findViewById(R.id.btnMicrophone)

        cameraButton =
            findViewById(R.id.btnCamera)

        leaveButton =
            findViewById(R.id.btnLeaveClass)
    }

    private fun initializeRoom() {

        room = LiveKit.create(applicationContext)

        room.initVideoRenderer(remoteRenderer)
        room.initVideoRenderer(localRenderer)
    }

    private fun setupButtons() {

        microphoneButton.setOnClickListener {

            if (!connected) return@setOnClickListener

            lifecycleScope.launch {
                try {
                    microphoneEnabled = !microphoneEnabled

                    room.localParticipant
                        .setMicrophoneEnabled(microphoneEnabled)

                    microphoneButton.text =
                        if (microphoneEnabled) {
                            "Desligar microfone"
                        } else {
                            "Ligar microfone"
                        }

                } catch (error: Exception) {
                    statusText.text =
                        "Não foi possível alterar o microfone."
                }
            }
        }

        cameraButton.setOnClickListener {

            if (!connected) return@setOnClickListener

            lifecycleScope.launch {
                try {
                    cameraEnabled = !cameraEnabled

                    room.localParticipant
                        .setCameraEnabled(cameraEnabled)

                    cameraButton.text =
                        if (cameraEnabled) {
                            "Desligar câmara"
                        } else {
                            "Ligar câmara"
                        }

                    if (!cameraEnabled) {
                        localRenderer.visibility = View.INVISIBLE
                        localPlaceholder.visibility = View.VISIBLE
                    }

                } catch (error: Exception) {
                    statusText.text =
                        "Não foi possível alterar a câmara."
                }
            }
        }

        leaveButton.setOnClickListener {
            disconnectAndFinish()
        }

        microphoneButton.text = "Desligar microfone"
        cameraButton.text = "Desligar câmara"
    }

    private fun checkPermissionsAndConnect() {

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

        val sessionId =
            intent.getStringExtra("sessionId") ?: return

        val token = getSharedPreferences(
            "aldair_one",
            Context.MODE_PRIVATE
        ).getString("token", null)

        if (token.isNullOrBlank()) {
            statusText.text =
                "Sessão expirada. Volta a iniciar sessão."
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

                } catch (error: Exception) {

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

        lifecycleScope.launch {

            try {

                // Receber os eventos de vídeo remoto.
                launch {
                    room.events.collect { event ->

                        when (event) {

                            is RoomEvent.TrackSubscribed -> {

                                val track = event.track

                                if (track is VideoTrack) {
                                    attachRemoteVideo(track)
                                }
                            }

                            else -> Unit
                        }
                    }
                }

                // Ligar à sala.
                room.connect(
                    serverUrl,
                    participantToken
                )

                // Ativar microfone e câmara.
                room.localParticipant
                    .setMicrophoneEnabled(true)

                room.localParticipant
                    .setCameraEnabled(true)

                microphoneEnabled = true
                cameraEnabled = true

                // Associar a câmara local ao renderizador.
                val publication =
                    room.localParticipant.getTrackPublication(
                        Track.Source.CAMERA
                    )

                localVideoTrack =
                    publication?.track as? LocalVideoTrack

                localVideoTrack?.addRenderer(localRenderer)

                if (localVideoTrack != null) {
                    localRenderer.visibility = View.VISIBLE
                    localPlaceholder.visibility = View.GONE
                }

                connected = true

                statusText.text =
                    "Ligado à sala de aula."

            } catch (error: Exception) {

                connected = false

                statusText.text =
                    "Erro ao entrar na sala: ${error.message}"
            }
        }
    }

    private fun attachRemoteVideo(track: VideoTrack) {

        runOnUiThread {

            try {

                remoteVideoTrack?.removeRenderer(remoteRenderer)

                remoteVideoTrack = track

                track.addRenderer(remoteRenderer)

                remoteRenderer.visibility = View.VISIBLE
                remotePlaceholder.visibility = View.GONE

                statusText.text =
                    "Vídeo de um participante recebido."

            } catch (error: Exception) {

                statusText.text =
                    "Não foi possível apresentar o vídeo remoto."
            }
        }
    }

    private fun disconnectAndFinish() {

        if (!::room.isInitialized) {
            finish()
            return
        }

        connected = false

        lifecycleScope.launch {

            try {
                remoteVideoTrack?.removeRenderer(remoteRenderer)
                localVideoTrack?.removeRenderer(localRenderer)

                room.disconnect()
                room.release()

            } catch (error: Exception) {
                // A atividade será encerrada mesmo se a
                // desconexão encontrar algum problema.
            }

            finish()
        }
    }

    override fun onDestroy() {
        super.onDestroy()

        connected = false

        if (::room.isInitialized && !isFinishing) {
            lifecycleScope.launch {
                try {
                    remoteVideoTrack?.removeRenderer(remoteRenderer)
                    localVideoTrack?.removeRenderer(localRenderer)
                    room.disconnect()
                    room.release()
                } catch (error: Exception) {
                    // Limpeza final.
                }
            }
        }
    }
}
