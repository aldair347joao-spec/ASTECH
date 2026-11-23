
import { Router } from "express";
import mongoose from "mongoose";

import Course from "../models/Course.js";
import ClassModel from "../models/Class.js";
import Enrollment from "../models/Enrollment.js";
import PaymentSettings from "../models/PaymentSettings.js";
import LiveSession from "../models/LiveSession.js";

import {
  authenticate,
  authorize
} from "../middleware/auth.js";

const router = Router();

const ADMIN_ROLES = ["super_admin", "admin"];
const TEACHING_ROLES = ["super_admin", "admin", "instructor"];

router.use(authenticate);

function isAdmin(user) {
  return ADMIN_ROLES.includes(user.role);
}

function isInstructor(user) {
  return user.role === "instructor";
}

function validId(id) {
  return mongoose.isValidObjectId(id);
}

function slugify(value) {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function canManageClass(user, classItem) {
  return (
    isAdmin(user) ||
    (
      isInstructor(user) &&
      classItem.instructor.toString() === user._id.toString()
    )
  );
}
// ==========================================
// CONFIGURAÇÃO DE PAGAMENTOS
// ==========================================

// Consultar dados de pagamento
// Alunos autenticados também podem consultar estes dados.
router.get("/payment-settings", async (req, res) => {
  try {
    const settings = await PaymentSettings.findOne().lean();

    return res.json({
      success: true,
      settings: settings || {
        multicaixaExpress: {
          number: "",
          holder: ""
        },
        bfa: {
          holder: "",
          account: "",
          iban: ""
        },
        instructions:
          "Indica o teu nome e o curso na descrição do pagamento."
      }
    });
  } catch (error) {
    console.error(
      "Erro ao consultar dados de pagamento:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar os dados de pagamento."
    });
  }
});

// Guardar dados de pagamento
router.patch(
  "/payment-settings",
  authorize(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const multicaixaExpress = {
        number: String(
          req.body.multicaixaExpress?.number || ""
        ).trim(),
        holder: String(
          req.body.multicaixaExpress?.holder || ""
        ).trim()
      };

      const bfa = {
        holder: String(
          req.body.bfa?.holder || ""
        ).trim(),
        account: String(
          req.body.bfa?.account || ""
        ).trim(),
        iban: String(
          req.body.bfa?.iban || ""
        ).trim()
      };

      const instructions = String(
        req.body.instructions || ""
      ).trim();

      let settings = await PaymentSettings.findOne();

      if (!settings) {
        settings = new PaymentSettings();
      }

      settings.multicaixaExpress = multicaixaExpress;
      settings.bfa = bfa;
      settings.instructions = instructions;
      settings.updatedBy = req.user._id;

      await settings.save();

      return res.json({
        success: true,
        message: "Dados de pagamento guardados com sucesso.",
        settings
      });
    } catch (error) {
      console.error(
        "Erro ao guardar dados de pagamento:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message: "Não foi possível guardar os dados de pagamento."
      });
    }
  }
);
// ==========================================
// CURSOS
// ==========================================

// Listar cursos publicados
router.get("/courses", async (req, res) => {
  try {
    const filter = {};

    if (isAdmin(req.user)) {
      if (req.query.status) {
        filter.status = req.query.status;
      }
    } else {
      filter.status = "published";
    }

    const courses = await Course.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      courses
    });
  } catch (error) {
    console.error("Erro ao listar cursos:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar os cursos."
    });
  }
});

// Consultar curso individual
router.get("/courses/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Identificador de curso inválido."
      });
    }

    const course = await Course.findById(req.params.id)
      .populate("createdBy", "name")
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Curso não encontrado."
      });
    }

    if (
      course.status !== "published" &&
      !isAdmin(req.user)
    ) {
      return res.status(403).json({
        success: false,
        message: "Este curso ainda não está disponível."
      });
    }

    return res.json({
      success: true,
      course
    });
  } catch (error) {
    console.error("Erro ao consultar curso:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível consultar o curso."
    });
  }
});

// Criar curso
router.post(
  "/courses",
  authorize(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const {
        title,
        summary,
        description,
        category,
        level,
        coverImage,
        price,
        durationHours,
        modules
      } = req.body;

      if (!title || !category) {
        return res.status(400).json({
          success: false,
          message: "O título e a categoria são obrigatórios."
        });
      }

      const slug = slugify(title);

      const existing = await Course.findOne({ slug });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Já existe um curso com este título."
        });
      }

      const course = await Course.create({
        title,
        slug,
        summary,
        description,
        category,
        level,
        coverImage,
        price,
        durationHours,
        modules,
        status: "draft",
        createdBy: req.user._id
      });

      return res.status(201).json({
        success: true,
        message: "Curso criado com sucesso.",
        course
      });
    } catch (error) {
      console.error("Erro ao criar curso:", error.message);

      return res.status(500).json({
        success: false,
        message: "Não foi possível criar o curso."
      });
    }
  }
);

// Atualizar curso
router.patch(
  "/courses/:id",
  authorize(...ADMIN_ROLES),
  async (req, res) => {
    try {
      if (!validId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Identificador de curso inválido."
        });
      }

      const allowedFields = [
        "title",
        "summary",
        "description",
        "category",
        "level",
        "coverImage",
        "price",
        "durationHours",
        "modules"
      ];

      const updates = {};

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (updates.title) {
        updates.slug = slugify(updates.title);
      }

      const course = await Course.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        {
          new: true,
          runValidators: true
        }
      );

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Curso não encontrado."
        });
      }

      return res.json({
        success: true,
        message: "Curso atualizado com sucesso.",
        course
      });
    } catch (error) {
      console.error("Erro ao atualizar curso:", error.message);

      return res.status(500).json({
        success: false,
        message: "Não foi possível atualizar o curso."
      });
    }
  }
);

// Publicar, arquivar ou retirar curso de publicação
router.patch(
  "/courses/:id/status",
  authorize(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { status } = req.body;

      if (!["draft", "published", "archived"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Estado do curso inválido."
        });
      }

      const course = await Course.findByIdAndUpdate(
        req.params.id,
        { $set: { status } },
        {
          new: true,
          runValidators: true
        }
      );

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Curso não encontrado."
        });
      }

      return res.json({
        success: true,
        message: "Estado do curso atualizado.",
        course
      });
    } catch (error) {
      console.error("Erro ao alterar curso:", error.message);

      return res.status(500).json({
        success: false,
        message: "Não foi possível alterar o curso."
      });
    }
  }
);

// ==========================================
// TURMAS
// ==========================================

// Listar turmas
router.get("/classes", async (req, res) => {
  try {
    const filter = {};

    if (isAdmin(req.user)) {
      if (req.query.status) {
        filter.status = req.query.status;
      }
    } else if (isInstructor(req.user)) {
      filter.instructor = req.user._id;
    } else if (req.user.role === "student") {
      const enrollments = await Enrollment.find({
        student: req.user._id,
        status: { $ne: "cancelled" }
      })
        .select("class")
        .lean();

      const enrolledClassIds = enrollments.map(
        enrollment => enrollment.class
      );

      filter.$or = [
        { status: "open" },
        { _id: { $in: enrolledClassIds } }
      ];
    } else {
      return res.status(403).json({
        success: false,
        message: "Não tens autorização para consultar as turmas."
      });
    }

    const classes = await ClassModel.find(filter)
      .populate("course", "title slug category level")
      .populate("instructor", "name email")
      .populate("students", "name email")
      .sort({ startDate: 1 })
      .lean();

    return res.json({
      success: true,
      classes
    });
  } catch (error) {
    console.error("Erro ao listar turmas:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar as turmas."
    });
  }
});

// ==========================================
// GESTÃO DE ALUNOS DA TURMA
// ==========================================

// Consultar lista de alunos e inscrições de uma turma
router.get("/classes/:id/roster", async (req, res) => {
  try {
    const classId = req.params.id;

    if (!validId(classId)) {
      return res.status(400).json({
        success: false,
        message: "Identificador de turma inválido."
      });
    }

    const classItem = await ClassModel.findById(classId)
      .populate("course", "title category level")
      .populate("instructor", "name email")
      .lean();

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: "Turma não encontrada."
      });
    }

    const instructorId =
      classItem.instructor?._id?.toString();

    if (
      !isAdmin(req.user) &&
      (
        !isInstructor(req.user) ||
        instructorId !== req.user._id.toString()
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "Não tens autorização para consultar esta turma."
      });
    }

    const enrollments = await Enrollment.find({
      class: classId
    })
      .populate("student", "name email")
      .sort({ enrolledAt: -1 })
      .lean();

    const activeEnrollments = enrollments.filter(
      item => item.status === "active"
    );

    const pendingEnrollments = enrollments.filter(
      item => item.status === "pending"
    );

    const completedEnrollments = enrollments.filter(
      item => item.status === "completed"
    );

    const cancelledEnrollments = enrollments.filter(
      item => item.status === "cancelled"
    );

    return res.json({
      success: true,

      class: {
        ...classItem,

        statistics: {
          capacity: classItem.capacity,
          active: activeEnrollments.length,
          pending: pendingEnrollments.length,
          completed: completedEnrollments.length,
          cancelled: cancelledEnrollments.length,
          available: Math.max(
            0,
            classItem.capacity - activeEnrollments.length
          )
        }
      },

      enrollments
    });

  } catch (error) {
    console.error(
      "Erro ao consultar alunos da turma:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar os alunos da turma."
    });
  }
});

// Criar turma
router.post(
  "/classes",
  authorize(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const {
        name,
        description,
        course,
        instructor,
        capacity,
        modality,
        location,
        startDate,
        endDate,
        timezone,
        schedule
      } = req.body;

      if (
        !name ||
        !validId(course) ||
        !validId(instructor) ||
        !startDate ||
        !endDate
      ) {
        return res.status(400).json({
          success: false,
          message: "Preenche os dados obrigatórios da turma."
        });
      }

      const courseExists = await Course.findOne({
        _id: course,
        status: "published"
      });

      if (!courseExists) {
        return res.status(400).json({
          success: false,
          message: "O curso não existe ou não está publicado."
        });
      }

      const instructorExists = await mongoose.model("User").findOne({
        _id: instructor,
        role: { $in: TEACHING_ROLES },
        isActive: true
      });

      if (!instructorExists) {
        return res.status(400).json({
          success: false,
          message: "Formador inválido ou inativo."
        });
      }

      const classItem = await ClassModel.create({
        name,
        description,
        course,
        instructor,
        capacity,
        modality,
        location,
        startDate,
        endDate,
        timezone,
        schedule,
        status: "draft",
        createdBy: req.user._id
      });

      return res.status(201).json({
        success: true,
        message: "Turma criada com sucesso.",
        class: classItem
      });
    } catch (error) {
      console.error("Erro ao criar turma:", error.message);

      return res.status(500).json({
        success: false,
        message: "Não foi possível criar a turma."
      });
    }
  }
);

// Atualizar turma
router.patch(
  "/classes/:id",
  authorize(...ADMIN_ROLES),
  async (req, res) => {
    try {
      if (!validId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Identificador de turma inválido."
        });
      }

      const allowedFields = [
        "name",
        "description",
        "instructor",
        "capacity",
        "modality",
        "location",
        "startDate",
        "endDate",
        "timezone",
        "schedule"
      ];

      const updates = {};

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (updates.instructor) {
        if (!validId(updates.instructor)) {
          return res.status(400).json({
            success: false,
            message: "Identificador de formador inválido."
          });
        }

        const instructorExists = await mongoose.model("User").findOne({
          _id: updates.instructor,
          role: { $in: TEACHING_ROLES },
          isActive: true
        });

        if (!instructorExists) {
          return res.status(400).json({
            success: false,
            message: "Formador inválido ou inativo."
          });
        }
      }

      const classItem = await ClassModel.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        {
          new: true,
          runValidators: true
        }
      );

      if (!classItem) {
        return res.status(404).json({
          success: false,
          message: "Turma não encontrada."
        });
      }

      return res.json({
        success: true,
        message: "Turma atualizada com sucesso.",
        class: classItem
      });
    } catch (error) {
      console.error("Erro ao atualizar turma:", error.message);

      return res.status(500).json({
        success: false,
        message: "Não foi possível atualizar a turma."
      });
    }
  }
);

// Alterar estado da turma
router.patch(
  "/classes/:id/status",
  authorize(...ADMIN_ROLES),
  async (req, res) => {
    try {
      const { status } = req.body;

      const allowedStatuses = [
        "draft",
        "open",
        "in_progress",
        "completed",
        "cancelled"
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Estado da turma inválido."
        });
      }

      const classItem = await ClassModel.findByIdAndUpdate(
        req.params.id,
        { $set: { status } },
        {
          new: true,
          runValidators: true
        }
      );

      if (!classItem) {
        return res.status(404).json({
          success: false,
          message: "Turma não encontrada."
        });
      }

      return res.json({
        success: true,
        message: "Estado da turma atualizado.",
        class: classItem
      });
    } catch (error) {
      console.error("Erro ao alterar turma:", error.message);

      return res.status(500).json({
        success: false,
        message: "Não foi possível alterar o estado da turma."
      });
    }
  }
);

// ==========================================
// INSCRIÇÕES
// ==========================================
 
// Inscrever aluno numa turma
router.post("/classes/:id/enroll", async (req, res) => {
  try {
    const classId = req.params.id;

    if (!validId(classId)) {
      return res.status(400).json({
        success: false,
        message: "Identificador de turma inválido."
      });
    }

    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Apenas alunos podem solicitar inscrições."
      });
    }

    const classItem = await ClassModel.findById(classId)
      .populate("course");

    if (!classItem || classItem.status !== "open") {
      return res.status(404).json({
        success: false,
        message: "Esta turma não está disponível para inscrições."
      });
    }

    if (!classItem.course) {
      return res.status(404).json({
        success: false,
        message: "O curso associado a esta turma não foi encontrado."
      });
    }

    const coursePrice = Number(
      classItem.course.price?.amount || 0
    );

    const isFree = coursePrice <= 0;

    const existingEnrollment = await Enrollment.findOne({
      student: req.user._id,
      class: classItem._id
    });

    if (
      existingEnrollment &&
      existingEnrollment.status !== "cancelled"
    ) {
      return res.status(409).json({
        success: false,
        message:
          existingEnrollment.status === "pending"
            ? "Já tens uma inscrição pendente de confirmação."
            : "Já estás inscrito nesta turma."
      });
    }

    // Apenas alunos já adicionados à turma ocupam vagas.
    const occupiedSeats = new Set(
      (classItem.students || []).map(
        student => student.toString()
      )
    );

    // Cursos gratuitos são ativados imediatamente.
    if (
      isFree &&
      Number(classItem.capacity || 0) > 0 &&
      occupiedSeats.size >= Number(classItem.capacity)
    ) {
      return res.status(409).json({
        success: false,
        message: "Esta turma já atingiu a sua capacidade."
      });
    }

    let paymentData;

    if (isFree) {
      paymentData = {
        status: "not_required",
        amount: 0,
        currency: classItem.course.price?.currency || "AOA",
        method: null
      };
    } else {
      const {
        paymentConfirmed,
        paymentMethod,
        proof
      } = req.body || {};

      if (paymentConfirmed !== true) {
        return res.status(400).json({
          success: false,
          message: "Confirma que já realizaste o pagamento."
        });
      }

      const allowedMethods = [
        "multicaixa_express",
        "bfa_transfer"
      ];

      if (!allowedMethods.includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: "Seleciona um método de pagamento válido."
        });
      }

      if (
        !proof ||
        !proof.originalName ||
        !proof.mimeType ||
        !proof.data
      ) {
        return res.status(400).json({
          success: false,
          message: "Anexa o comprovativo do pagamento."
        });
      }

      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png"
      ];

      if (!allowedTypes.includes(proof.mimeType)) {
        return res.status(400).json({
          success: false,
          message: "Formato inválido. Envia PDF, JPG ou PNG."
        });
      }

      // Aceita base64 simples ou Data URL.
      const base64Data = String(proof.data)
        .replace(/^data:[^;]+;base64,/, "")
        .replace(/\s/g, "");

      if (
        !base64Data ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)
      ) {
        return res.status(400).json({
          success: false,
          message: "O ficheiro enviado não é válido."
        });
      }

      const fileBuffer = Buffer.from(base64Data, "base64");

      const maxFileSize = 5 * 1024 * 1024;

      if (
        fileBuffer.length === 0 ||
        fileBuffer.length > maxFileSize
      ) {
        return res.status(400).json({
          success: false,
          message: "O comprovativo não pode ultrapassar 5 MB."
        });
      }

      // Verificar assinatura real do ficheiro.
      const isPDF =
        fileBuffer.subarray(0, 5).toString() === "%PDF-";

      const isJPEG =
        fileBuffer.length >= 3 &&
        fileBuffer[0] === 0xFF &&
        fileBuffer[1] === 0xD8 &&
        fileBuffer[2] === 0xFF;

      const isPNG =
        fileBuffer.length >= 8 &&
        fileBuffer.subarray(0, 8).equals(
          Buffer.from([
            0x89, 0x50, 0x4E, 0x47,
            0x0D, 0x0A, 0x1A, 0x0A
          ])
        );

      const validFile =
        (proof.mimeType === "application/pdf" && isPDF) ||
        (proof.mimeType === "image/jpeg" && isJPEG) ||
        (proof.mimeType === "image/png" && isPNG);

      if (!validFile) {
        return res.status(400).json({
          success: false,
          message: "O conteúdo do ficheiro não corresponde ao formato indicado."
        });
      }

      const originalName = String(proof.originalName)
        .split(/[\\/]/)
        .pop()
        .slice(0, 180);

      paymentData = {
        status: "pending",
        amount: coursePrice,
        currency: classItem.course.price?.currency || "AOA",
        method: paymentMethod,
        proof: {
          originalName,
          mimeType: proof.mimeType,
          size: fileBuffer.length,
          data: fileBuffer.toString("base64"),
          submittedAt: new Date(),
          reviewStatus: "pending",
          reviewedAt: null,
          reviewedBy: null,
          rejectionReason: ""
        }
      };
    }

    const enrollmentData = {
      student: req.user._id,
      course: classItem.course._id,
      class: classItem._id,
      status: isFree ? "active" : "pending",
      payment: paymentData
    };

    let enrollment;

    if (existingEnrollment) {
      existingEnrollment.status = enrollmentData.status;
      existingEnrollment.payment = enrollmentData.payment;
      existingEnrollment.cancelledAt = null;
      existingEnrollment.completedAt = null;

      enrollment = await existingEnrollment.save();
    } else {
      enrollment = await Enrollment.create(enrollmentData);
    }

    // Apenas inscrições gratuitas são ativadas imediatamente.
    if (isFree) {
      await ClassModel.updateOne(
        { _id: classItem._id },
        {
          $addToSet: {
            students: req.user._id
          }
        }
      );
    }

    // Não devolver o conteúdo base64 do comprovativo.
    const safeEnrollment = enrollment.toObject();

    if (safeEnrollment.payment?.proof) {
      delete safeEnrollment.payment.proof.data;
    }

    return res.status(201).json({
      success: true,
      message: isFree
        ? "Inscrição realizada com sucesso. Já podes aceder às aulas."
        : "Inscrição enviada com sucesso. O comprovativo aguarda confirmação do administrador.",
      enrollment: safeEnrollment
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Já existe uma inscrição nesta turma."
      });
    }

    console.error(
      "Erro ao inscrever aluno:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Não foi possível realizar a inscrição."
    });
  }
});
  
     
// Consultar inscrições
router.get("/enrollments", async (req, res) => {
  try {
    const filter = {};

    if (!isAdmin(req.user)) {
      if (isInstructor(req.user)) {
        const instructorClasses = await ClassModel.find({
          instructor: req.user._id
        }).select("_id");

        filter.class = {
          $in: instructorClasses.map(item => item._id)
        };
      } else {
        filter.student = req.user._id;
      }
    }

    const enrollments = await Enrollment.find(filter)
      .populate("student", "name email")
      .populate("course", "title category")
      .populate("class", "name startDate endDate")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      enrollments
    });
  } catch (error) {
    console.error("Erro ao consultar inscrições:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar as inscrições."
    });
  }
});

// ==========================================
// ACOMPANHAMENTO DO PROGRESSO DO ALUNO
// ==========================================

// Marcar uma aula como concluída no progresso do próprio aluno
router.patch(
  "/enrollments/:id/progress",
  async (req, res) => {
    try {
      const { lessonId } = req.body;
      const enrollmentId = req.params.id;

      if (!validId(enrollmentId) || !validId(lessonId)) {
        return res.status(400).json({
          success: false,
          message: "Identificador de inscrição ou aula inválido."
        });
      }

      if (req.user.role !== "student") {
        return res.status(403).json({
          success: false,
          message: "Apenas o próprio aluno pode atualizar o seu progresso."
        });
      }

      const enrollment = await Enrollment.findById(enrollmentId);

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: "Inscrição não encontrada."
        });
      }

      if (enrollment.student.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Não tens autorização para alterar esta inscrição."
        });
      }

      if (enrollment.status !== "active") {
        return res.status(400).json({
          success: false,
          message: "Só é possível atualizar o progresso de inscrições ativas."
        });
      }

      const course = await Course.findById(enrollment.course)
        .select("modules")
        .lean();

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Curso associado à inscrição não encontrado."
        });
      }

      const allLessons = (course.modules || []).flatMap(module =>
        (module.lessons || []).map(lesson => ({
          ...lesson,
          moduleId: module._id
        }))
      );

      const publishedLessons = allLessons.filter(
        lesson => lesson.isPublished === true
      );

      const requestedLesson = publishedLessons.find(
        lesson => lesson._id.toString() === lessonId
      );

      if (!requestedLesson) {
        return res.status(404).json({
          success: false,
          message: "Aula não encontrada ou ainda não publicada."
        });
      }

      if (publishedLessons.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Este curso ainda não tem aulas publicadas."
        });
      }

      const validLessonIds = new Set(
        publishedLessons.map(lesson => lesson._id.toString())
      );

      const completedIds = new Set(
        (enrollment.progress?.completedLessons || [])
          .map(id => id.toString())
          .filter(id => validLessonIds.has(id))
      );

      completedIds.add(lessonId);

      enrollment.progress.completedLessons = Array.from(
        completedIds,
        id => new mongoose.Types.ObjectId(id)
      );

      const totalLessons = publishedLessons.length;
      const completedCount = completedIds.size;

      enrollment.progress.percentage = Math.round(
        (completedCount / totalLessons) * 100
      );

      enrollment.progress.lastAccessedAt = new Date();

      if (!enrollment.startedAt) {
        enrollment.startedAt = new Date();
      }

      if (completedCount === totalLessons) {
        enrollment.progress.percentage = 100;
        enrollment.status = "completed";

        if (!enrollment.completedAt) {
          enrollment.completedAt = new Date();
        }
      }

      await enrollment.save();

      return res.json({
        success: true,
        message: "Progresso atualizado com sucesso.",
        progress: {
          percentage: enrollment.progress.percentage,
          completedLessons: completedCount,
          totalLessons,
          completed: enrollment.status === "completed",
          lastAccessedAt: enrollment.progress.lastAccessedAt
        },
        enrollmentStatus: enrollment.status
      });
    } catch (error) {
      console.error(
        "Erro ao atualizar progresso do aluno:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message: "Não foi possível atualizar o progresso."
      });
    }
  }
);

// Confirmar pagamento e ativar inscrição
router.patch(
  "/enrollments/:id/activate",
  authorize(...ADMIN_ROLES),
  async (req, res) => {
    try {
      if (!validId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Identificador de inscrição inválido."
        });
      }

      const enrollment = await Enrollment.findById(req.params.id);

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: "Inscrição não encontrada."
        });
      }

      if (enrollment.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Não é possível ativar uma inscrição cancelada."
        });
      }

      const classItem = await ClassModel.findById(enrollment.class);

      if (!classItem || classItem.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "A turma não está disponível."
        });
      }

      const alreadyAdded = classItem.students.some(
        student => student.toString() === enrollment.student.toString()
      );

      // Contar também outros pedidos pendentes que reservam vagas.
      const pendingEnrollments = await Enrollment.find({
        class: classItem._id,
        status: "pending",
        _id: { $ne: enrollment._id }
      })
        .select("student")
        .lean();

      const occupiedStudents = new Set(
        classItem.students.map(student => student.toString())
      );

      for (const item of pendingEnrollments) {
        occupiedStudents.add(item.student.toString());
      }

      if (
        !alreadyAdded &&
        occupiedStudents.size >= Number(classItem.capacity || 0)
      ) {
        return res.status(409).json({
          success: false,
          message: "A turma já atingiu a capacidade máxima."
        });
      }

      enrollment.status = "active";

      if (enrollment.payment.status !== "not_required") {
        enrollment.payment.status = "paid";
        enrollment.payment.paidAt = new Date();
      }

      await enrollment.save();

      await ClassModel.updateOne(
        { _id: classItem._id },
        { $addToSet: { students: enrollment.student } }
      );

      return res.json({
        success: true,
        message: "Inscrição ativada com sucesso.",
        enrollment
      });
    } catch (error) {
      console.error("Erro ao ativar inscrição:", error.message);

      return res.status(500).json({
        success: false,
        message: "Não foi possível ativar a inscrição."
      });
    }
  }
);

// ==========================================
// AULAS ONLINE
// ==========================================

// Listar sessões autorizadas
router.get("/live-sessions", async (req, res) => {
  try {
    let allowedClassIds = null;

    if (!isAdmin(req.user)) {
      if (isInstructor(req.user)) {
        const classes = await ClassModel.find({
          instructor: req.user._id
        }).select("_id");

        allowedClassIds = classes.map(item => item._id);
      } else {
        const enrollments = await Enrollment.find({
          student: req.user._id,
          status: "active"
        }).select("class");

        allowedClassIds = enrollments.map(item => item.class);
      }
    }

    const filter = allowedClassIds
      ? { class: { $in: allowedClassIds } }
      : {};

    const sessions = await LiveSession.find(filter)
      .populate("course", "title")
      .populate("class", "name")
      .populate("instructor", "name")
      .sort({ scheduledStart: 1 })
      .lean();

    return res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error("Erro ao listar aulas online:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar as aulas online."
    });
  }
});

// Agendar aula online
router.post(
  "/live-sessions",
  authorize(...TEACHING_ROLES),
  async (req, res) => {
    try {
      const {
        title,
        description,
        class: classId,
        scheduledStart,
        scheduledEnd,
        recordingEnabled
      } = req.body;

      if (
        !title ||
        !validId(classId) ||
        !scheduledStart ||
        !scheduledEnd
      ) {
        return res.status(400).json({
          success: false,
          message: "Preenche os dados obrigatórios da aula."
        });
      }

      const start = new Date(scheduledStart);
      const end = new Date(scheduledEnd);

      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        end <= start
      ) {
        return res.status(400).json({
          success: false,
          message: "O horário da aula é inválido."
        });
      }

      const classItem = await ClassModel.findById(classId);

      if (!classItem) {
        return res.status(404).json({
          success: false,
          message: "Turma não encontrada."
        });
      }

      if (!canManageClass(req.user, classItem)) {
        return res.status(403).json({
          success: false,
          message: "Não tens permissão para agendar nesta turma."
        });
      }

      if (classItem.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Não podes agendar aulas numa turma cancelada."
        });
      }

      const roomName = `aldair-one-${new mongoose.Types.ObjectId()}`;

      const session = await LiveSession.create({
        title,
        description,
        course: classItem.course,
        class: classItem._id,
        instructor: classItem.instructor,
        provider: "livekit",
        roomName,
        scheduledStart: start,
        scheduledEnd: end,
        timezone: classItem.timezone || "Africa/Luanda",
        status: "scheduled",
        recording: {
          enabled:
            (isAdmin(req.user) || isInstructor(req.user)) &&
            recordingEnabled === true,
          status:
            recordingEnabled === true &&
            (isAdmin(req.user) || isInstructor(req.user))
              ? "not_started"
              : "disabled"
        },
        createdBy: req.user._id
      });

      return res.status(201).json({
        success: true,
        message: "Aula online agendada com sucesso.",
        session
      });
    } catch (error) {
      console.error("Erro ao agendar aula:", error.message);

      return res.status(500).json({
        success: false,
        message: "Não foi possível agendar a aula."
      });
    }
  }
);

export default router;
