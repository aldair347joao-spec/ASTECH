
package com.aldairone.mobile

import android.app.Activity
import android.os.Bundle
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import okhttp3.*
import org.json.JSONObject
import org.json.JSONArray
import java.io.IOException

class MainActivity : AppCompatActivity() {

    private val apiBase = "https://astech-l7vb.onrender.com/api"

    private val client = OkHttpClient()

    private lateinit var root: LinearLayout
    private lateinit var content: LinearLayout
    private lateinit var statusText: TextView

    private var accessToken: String? = null

    private val backgroundColor = Color.rgb(10, 16, 32)
    private val cardColor = Color.rgb(22, 32, 54)
    private val accentColor = Color.rgb(48, 126, 255)
    private val textColor = Color.WHITE
    private val mutedColor = Color.rgb(170, 183, 205)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        accessToken = getSharedPreferences(
            "aldair_one",
            Context.MODE_PRIVATE
        ).getString("token", null)

        if (accessToken != null) {
            loadSessions()
        } else {
            showLogin()
        }
    }

    private fun createRoot() {
        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(backgroundColor)
            setPadding(24, 30, 24, 24)
        }

        val scroll = ScrollView(this)
        scroll.addView(root)

        setContentView(scroll)
    }

    private fun addText(
        parent: LinearLayout,
        value: String,
        size: Float,
        color: Int,
        bold: Boolean = false
    ): TextView {
        val text = TextView(this).apply {
            text = value
            textSize = size
            setTextColor(color)

            if (bold) {
                setTypeface(null, Typeface.BOLD)
            }

            setPadding(0, 8, 0, 8)
        }

        parent.addView(text)
        return text
    }

    private fun addInput(
        parent: LinearLayout,
        hintText: String,
        password: Boolean = false
    ): EditText {

        val input = EditText(this).apply {
            hint = hintText
            setHintTextColor(mutedColor)
            setTextColor(textColor)
            textSize = 15f
            setSingleLine(true)
            setPadding(18, 14, 18, 14)

            background = roundedBackground(
                cardColor,
                16
            )

            if (password) {
                inputType =
                    android.text.InputType.TYPE_CLASS_TEXT or
                    android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
            } else {
                inputType =
                    android.text.InputType.TYPE_CLASS_TEXT or
                    android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
            }
        }

        val params = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        )

        params.setMargins(0, 8, 0, 14)

        parent.addView(input, params)

        return input
    }

    private fun addButton(
        parent: LinearLayout,
        label: String,
        onClick: () -> Unit
    ): Button {

        val button = Button(this).apply {
            text = label
            textSize = 14f
            setTextColor(Color.WHITE)
            isAllCaps = false
            background = roundedBackground(accentColor, 16)
            setOnClickListener { onClick() }
        }

        val params = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            58
        )

        params.setMargins(0, 12, 0, 12)

        parent.addView(button, params)

        return button
    }

    private fun roundedBackground(
        color: Int,
        radius: Int
    ): GradientDrawable {
        return GradientDrawable().apply {
            setColor(color)
            cornerRadius = radius.toFloat()
        }
    }

    private fun showLogin() {
        createRoot()

        root.gravity = Gravity.CENTER_VERTICAL

        addText(
            root,
            "ALDAIR ONE",
            30f,
            textColor,
            true
        )

        addText(
            root,
            "ONE PLATFORM. MULTIPLE SOLUTIONS.",
            11f,
            accentColor,
            true
        )

        addText(
            root,
            "Sala de Aula Online",
            24f,
            textColor,
            true
        )

        addText(
            root,
            "Entra na tua conta para aceder às aulas.",
            14f,
            mutedColor
        )

        val emailInput = addInput(
            root,
            "Endereço de email"
        )

        val passwordInput = addInput(
            root,
            "Palavra-passe",
            true
        )

        statusText = addText(
            root,
            "",
            13f,
            mutedColor
        )

        addButton(root, "Entrar na plataforma") {

            val email = emailInput.text.toString().trim()
            val password = passwordInput.text.toString()

            if (email.isEmpty() || password.isEmpty()) {
                statusText.text =
                    "Preenche o email e a palavra-passe."
                return@addButton
            }

            login(email, password)
        }

        addText(
            root,
            "Acesso protegido pelo ALDAIR ONE.",
            12f,
            mutedColor
        )
    }

    private fun login(
        email: String,
        password: String
    ) {

        statusText.text = "A autenticar..."

        val body = JSONObject().apply {
            put("email", email)
            put("password", password)
        }

        val requestBody = RequestBody.create(
            MediaType.parse("application/json; charset=utf-8"),
            body.toString()
        )

        val request = Request.Builder()
            .url("$apiBase/auth/login")
            .post(requestBody)
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
                                    "Credenciais inválidas."
                                )
                        }
                        return
                    }

                    val token = json.optString("token")

                    if (token.isBlank()) {
                        runOnUiThread {
                            statusText.text =
                                "O servidor não devolveu o token."
                        }
                        return
                    }

                    getSharedPreferences(
                        "aldair_one",
                        Context.MODE_PRIVATE
                    ).edit()
                        .putString("token", token)
                        .apply()

                    accessToken = token

                    runOnUiThread {
                        loadSessions()
                    }

                } catch (e: Exception) {
                    runOnUiThread {
                        statusText.text =
                            "Resposta inválida do servidor."
                    }
                }
            }
        })
    }

    private fun loadSessions() {

        createRoot()

        addText(
            root,
            "ALDAIR ONE",
            25f,
            textColor,
            true
        )

        addText(
            root,
            "As tuas aulas online",
            19f,
            textColor,
            true
        )

        statusText = addText(
            root,
            "A carregar as aulas...",
            13f,
            mutedColor
        )

        val token = accessToken

        if (token.isNullOrBlank()) {
            showLogin()
            return
        }

        val request = Request.Builder()
            .url("$apiBase/academy/live-sessions")
            .header("Authorization", "Bearer $token")
            .get()
            .build()

        client.newCall(request).enqueue(object : Callback {

            override fun onFailure(
                call: Call,
                e: IOException
            ) {
                runOnUiThread {
                    statusText.text =
                        "Erro de ligação. Tenta novamente."
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
                                    "Não foi possível carregar as aulas."
                                )
                        }
                        return
                    }

                    val sessions =
                        json.optJSONArray("sessions") ?: JSONArray()

                    runOnUiThread {
                        displaySessions(sessions)
                    }

                } catch (e: Exception) {
                    runOnUiThread {
                        statusText.text =
                            "Não foi possível interpretar as aulas."
                    }
                }
            }
        })
    }

    private fun displaySessions(sessions: JSONArray) {

        root.removeAllViews()

        addText(
            root,
            "ALDAIR ONE",
            25f,
            textColor,
            true
        )

        addText(
            root,
            "As tuas aulas online",
            20f,
            textColor,
            true
        )

        addText(
            root,
            "Seleciona uma aula para consultar o seu estado.",
            13f,
            mutedColor
        )

        if (sessions.length() == 0) {
            addText(
                root,
                "Ainda não existem aulas disponíveis para a tua conta.",
                15f,
                mutedColor
            )
        }

        for (i in 0 until sessions.length()) {

            val session = sessions.optJSONObject(i)
                ?: continue

            val title = session.optString(
                "title",
                "Aula online"
            )

            val status = session.optString(
                "status",
                "scheduled"
            )

            val start = session.optString(
                "scheduledStart",
                ""
            )

            val card = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(18, 16, 18, 16)
                background = roundedBackground(cardColor, 18)
            }

            val params = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )

            params.setMargins(0, 12, 0, 12)

            root.addView(card, params)

            addText(
                card,
                title,
                17f,
                textColor,
                true
            )

            addText(
                card,
                "Estado: ${translateStatus(status)}",
                13f,
                if (status == "live") accentColor else mutedColor
            )

            if (start.isNotBlank()) {
                addText(
                    card,
                    "Início: $start",
                    12f,
                    mutedColor
                )
            }

            if (status == "live") {
                addButton(card, "Entrar na sala") {
                    val id = session.optString("_id")

                    if (id.isNotBlank()) {
                        requestRoomAccess(id)
                    }
                }
            } else {
                addText(
                    card,
                    "A sala estará disponível quando a aula estiver em direto.",
                    12f,
                    mutedColor
                )
            }
        }

        addButton(root, "Atualizar aulas") {
            loadSessions()
        }

        addButton(root, "Terminar sessão") {
            getSharedPreferences(
                "aldair_one",
                Context.MODE_PRIVATE
            ).edit()
                .remove("token")
                .apply()

            accessToken = null
            showLogin()
        }
    }

    private fun translateStatus(status: String): String {
        return when (status) {
            "scheduled" -> "Agendada"
            "live" -> "Em direto"
            "completed" -> "Concluída"
            "cancelled" -> "Cancelada"
            else -> status
        }
    }

    private fun requestRoomAccess(sessionId: String) {
        Toast.makeText(
            this,
            "A preparar o acesso à sala...",
            Toast.LENGTH_SHORT
        ).show()
    }
}
