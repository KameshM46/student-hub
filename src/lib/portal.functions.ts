import { createServerFn } from "@tanstack/react-start";
import { Binary, ObjectId } from "mongodb";
import { z } from "zod";

import {
  clearSessionCookie,
  hashPassword,
  readSession,
  setSessionCookie,
  verifyPassword,
} from "./auth.server";
import { getDb } from "./mongo.server";
import { normalizeId } from "./portal";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function dobPasswordSeed(
  dob: string,
) {
  return `dob-${dob.trim()}`;
}

/* -------------------------------------------------------------------------- */
/* REGISTER                                                                   */
/* -------------------------------------------------------------------------- */

const registerSchema =
  z.object({
    role:
      z.enum([
        "student",
        "admin",
      ]),

    identifier:
      z.string()
        .min(3)
        .max(40),

    fullName:
      z.string()
        .min(2)
        .max(120),

    dob:
      z.string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
        ),

    adminCode:
      z.string()
        .optional(),
  });

export const registerAccount =
  createServerFn({
    method: "POST",
  })
    .inputValidator(
      (data: unknown) =>
        registerSchema.parse(
          data,
        ),
    )
    .handler(
      async ({ data }) => {
        if (
          data.role ===
          "admin"
        ) {
          const expected =
            process.env[
              "ADMIN_ACCESS_CODE"
            ];

          if (
            !expected ||
            data.adminCode?.trim() !==
              expected
          ) {
            return {
              ok: false as const,
              error:
                "Invalid admin access code.",
            };
          }
        }

        const registerNo =
          normalizeId(
            data.identifier,
          ).toUpperCase();

        if (!registerNo) {
          return {
            ok: false as const,
            error:
              "Enter a valid number.",
          };
        }

        const db =
          await getDb();

        const users =
          db.collection(
            "users",
          );

        const existing =
          await users.findOne({
            role:
              data.role,
            register_no:
              registerNo,
          });

        if (existing) {
          return {
            ok: false as const,
            error:
              "That number is already registered. Try signing in.",
          };
        }

        const passwordHash =
          await hashPassword(
            dobPasswordSeed(
              data.dob,
            ),
          );

        await users.insertOne({
          role:
            data.role,

          register_no:
            registerNo,

          full_name:
            data.fullName.trim(),

          dob:
            data.dob,

          passwordHash,

          photo_url: null,

          department: null,
          year: null,
          section: null,

          phone: null,
          email: null,
          address: null,

          blood_group: null,

          guardian_name: null,
          guardian_phone: null,

          instagram_url: null,
          linkedin_url: null,
          github_url: null,
          leetcode_url: null,
          hackerrank_url: null,
          portfolio_url: null,
          twitter_url: null,
          youtube_url: null,

          created_at:
            new Date().toISOString(),
        });

        return {
          ok: true as const,
        };
      },
    );

/* -------------------------------------------------------------------------- */
/* LOGIN                                                                      */
/* -------------------------------------------------------------------------- */

const loginSchema =
  z.object({
    role:
      z.enum([
        "student",
        "admin",
      ]),

    identifier:
      z.string().min(1),

    dob:
      z.string().min(1),
  });

export const loginAccount =
  createServerFn({
    method: "POST",
  })
    .inputValidator(
      (data: unknown) =>
        loginSchema.parse(
          data,
        ),
    )
    .handler(
      async ({ data }) => {
        const registerNo =
          normalizeId(
            data.identifier,
          ).toUpperCase();

        const db =
          await getDb();

        const user =
          await db
            .collection("users")
            .findOne({
              role:
                data.role,

              register_no:
                registerNo,
            });

        if (!user) {
          return {
            ok: false as const,
            error:
              "Number or date of birth is incorrect.",
          };
        }

        const valid =
          await verifyPassword(
            dobPasswordSeed(
              data.dob,
            ),
            user[
              "passwordHash"
            ] as string,
          );

        if (!valid) {
          return {
            ok: false as const,
            error:
              "Number or date of birth is incorrect.",
          };
        }

        await setSessionCookie({
          sub:
            user[
              "_id"
            ].toString(),

          role:
            user[
              "role"
            ] as
              | "student"
              | "admin",
        });

        return {
          ok: true as const,
        };
      },
    );

/* -------------------------------------------------------------------------- */
/* LOGOUT                                                                     */
/* -------------------------------------------------------------------------- */

export const logoutAccount =
  createServerFn({
    method: "POST",
  }).handler(async () => {
    clearSessionCookie();

    return {
      ok: true as const,
    };
  });

/* -------------------------------------------------------------------------- */
/* CURRENT USER                                                               */
/* -------------------------------------------------------------------------- */

export const getMe =
  createServerFn({
    method: "GET",
  }).handler(async () => {
    const session =
      await readSession();

    if (!session) {
      return {
        user: null,
        profile: null,
        isAdmin: false,
      };
    }

    const db =
      await getDb();

    const user =
      await db
        .collection("users")
        .findOne({
          _id:
            new ObjectId(
              session.sub,
            ),
        });

    if (!user) {
      return {
        user: null,
        profile: null,
        isAdmin: false,
      };
    }

    return {
      user: {
        id: session.sub,
      },

      isAdmin:
        session.role ===
        "admin",

      profile: {
        id: session.sub,

        register_no:
          user[
            "register_no"
          ] as string,

        full_name:
          user[
            "full_name"
          ] as string,

        dob:
          (user[
            "dob"
          ] as string | null) ??
          null,

        photo_url:
          (user[
            "photo_url"
          ] as string | null) ??
          null,

        department:
          (user[
            "department"
          ] as string | null) ??
          null,

        year:
          (user[
            "year"
          ] as string | null) ??
          null,

        section:
          (user[
            "section"
          ] as string | null) ??
          null,

        phone:
          (user[
            "phone"
          ] as string | null) ??
          null,

        email:
          (user[
            "email"
          ] as string | null) ??
          null,

        address:
          (user[
            "address"
          ] as string | null) ??
          null,

        blood_group:
          (user[
            "blood_group"
          ] as string | null) ??
          null,

        guardian_name:
          (user[
            "guardian_name"
          ] as string | null) ??
          null,

        guardian_phone:
          (user[
            "guardian_phone"
          ] as string | null) ??
          null,

        instagram_url:
          (user[
            "instagram_url"
          ] as string | null) ??
          null,

        linkedin_url:
          (user[
            "linkedin_url"
          ] as string | null) ??
          null,

        github_url:
          (user[
            "github_url"
          ] as string | null) ??
          null,

        leetcode_url:
          (user[
            "leetcode_url"
          ] as string | null) ??
          null,

        hackerrank_url:
          (user[
            "hackerrank_url"
          ] as string | null) ??
          null,

        portfolio_url:
          (user[
            "portfolio_url"
          ] as string | null) ??
          null,

        twitter_url:
          (user[
            "twitter_url"
          ] as string | null) ??
          null,

        youtube_url:
          (user[
            "youtube_url"
          ] as string | null) ??
          null,
      },
    };
  });

/* -------------------------------------------------------------------------- */
/* AMCAT PDF STORAGE                                                          */
/* -------------------------------------------------------------------------- */

const amcatUploadSchema =
  z.object({
    fileName:
      z.string()
        .min(1)
        .max(255),

    fileType:
      z.literal(
        "application/pdf",
      ),

    fileBase64:
      z.string().min(1),
  });

const getAmcatPdfSchema =
  z.object({
    reportId:
      z.string().min(1),
  });

export const uploadAmcatReport =
  createServerFn({
    method: "POST",
  })
    .inputValidator(
      (data: unknown) =>
        amcatUploadSchema.parse(
          data,
        ),
    )
    .handler(
      async ({ data }) => {
        const session =
          await readSession();

        if (!session) {
          return {
            ok: false as const,
            error:
              "You must be logged in.",
          };
        }

        if (
          session.role !==
          "student"
        ) {
          return {
            ok: false as const,
            error:
              "Only students can upload AMCAT reports.",
          };
        }

        try {
          const pdfBuffer =
            Buffer.from(
              data.fileBase64,
              "base64",
            );

          const MAX_FILE_SIZE =
            10 *
            1024 *
            1024;

          if (
            pdfBuffer.length ===
            0
          ) {
            return {
              ok: false as const,
              error:
                "The PDF is empty.",
            };
          }

          if (
            pdfBuffer.length >
            MAX_FILE_SIZE
          ) {
            return {
              ok: false as const,
              error:
                "PDF must be smaller than 10 MB.",
            };
          }

          const header =
            pdfBuffer
              .subarray(
                0,
                5,
              )
              .toString(
                "ascii",
              );

          if (
            header !==
            "%PDF-"
          ) {
            return {
              ok: false as const,
              error:
                "The uploaded file is not a valid PDF.",
            };
          }

          const db =
            await getDb();

          const result =
            await db
              .collection(
                "amcat_reports",
              )
              .insertOne({
                student_id:
                  session.sub,

                uploaded_by:
                  session.sub,

                uploaded_by_role:
                  "student",

                file_name:
                  data.fileName,

                file_type:
                  "application/pdf",

                file_size:
                  pdfBuffer.length,

                uploaded_at:
                  new Date().toISOString(),

                pdf_data:
                  new Binary(
                    pdfBuffer,
                  ),

                storage_type:
                  "mongodb",
              });

          return {
            ok: true as const,

            reportId:
              result.insertedId.toString(),

            fileName:
              data.fileName,
          };
        } catch (error) {
          console.error(
            "AMCAT upload error:",
            error,
          );

          return {
            ok: false as const,
            error:
              "Failed to store AMCAT PDF.",
          };
        }
      },
    );

/* -------------------------------------------------------------------------- */
/* STUDENT AMCAT LIST                                                        */
/* -------------------------------------------------------------------------- */

export const getMyAmcatReports =
  createServerFn({
    method: "GET",
  }).handler(
    async () => {
      const session =
        await readSession();

      if (!session) {
        return {
          ok: false as const,
          error:
            "You must be logged in.",
          reports: [],
        };
      }

      if (
        session.role !==
        "student"
      ) {
        return {
          ok: false as const,
          error:
            "Only students can view AMCAT reports.",
          reports: [],
        };
      }

      try {
        const db =
          await getDb();

        const reports =
          await db
            .collection(
              "amcat_reports",
            )
            .find({
              student_id:
                session.sub,
            })
            .sort({
              uploaded_at:
                -1,
            })
            .toArray();

        return {
          ok: true as const,

          reports:
            reports.map(
              (report) => ({
                id:
                  report[
                    "_id"
                  ].toString(),

                fileName:
                  (report[
                    "file_name"
                  ] as string) ??
                  "AMCAT Report.pdf",

                fileSize:
                  (report[
                    "file_size"
                  ] as number) ??
                  0,

                uploadedAt:
                  (report[
                    "uploaded_at"
                  ] as string) ??
                  "",

                hasPdf:
                  Boolean(
                    report[
                      "pdf_data"
                    ],
                  ),
              }),
            ),
        };
      } catch (error) {
        console.error(
          "Get AMCAT reports error:",
          error,
        );

        return {
          ok: false as const,
          error:
            "Failed to load AMCAT reports.",
          reports: [],
        };
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* STUDENT AMCAT VIEW                                                        */
/* -------------------------------------------------------------------------- */

export const getAmcatPdf =
  createServerFn({
    method: "GET",
  })
    .inputValidator(
      (data: unknown) =>
        getAmcatPdfSchema.parse(
          data,
        ),
    )
    .handler(
      async ({ data }) => {
        const session =
          await readSession();

        if (!session) {
          return {
            ok: false as const,
            error:
              "You must be logged in.",
          };
        }

        if (
          session.role !==
          "student"
        ) {
          return {
            ok: false as const,
            error:
              "Only students can view AMCAT reports.",
          };
        }

        if (
          !ObjectId.isValid(
            data.reportId,
          )
        ) {
          return {
            ok: false as const,
            error:
              "Invalid AMCAT report ID.",
          };
        }

        try {
          const db =
            await getDb();

          const report =
            await db
              .collection(
                "amcat_reports",
              )
              .findOne({
                _id:
                  new ObjectId(
                    data.reportId,
                  ),

                student_id:
                  session.sub,
              });

          if (!report) {
            return {
              ok: false as const,
              error:
                "AMCAT report not found.",
            };
          }

          const storedPdf =
            report[
              "pdf_data"
            ];

          if (!storedPdf) {
            return {
              ok: false as const,
              error:
                "The PDF file is not available.",
            };
          }

          let pdfBuffer:
            Buffer;

          if (
            Buffer.isBuffer(
              storedPdf,
            )
          ) {
            pdfBuffer =
              storedPdf;
          } else if (
            storedPdf instanceof
            Binary
          ) {
            pdfBuffer =
              Buffer.from(
                storedPdf.buffer,
              );
          } else {
            throw new Error(
              "Unable to read stored PDF.",
            );
          }

          return {
            ok: true as const,

            fileName:
              (report[
                "file_name"
              ] as string) ??
              "AMCAT Report.pdf",

            mimeType:
              "application/pdf",

            fileBase64:
              pdfBuffer.toString(
                "base64",
              ),
          };
        } catch (error) {
          console.error(
            "Get AMCAT PDF error:",
            error,
          );

          return {
            ok: false as const,
            error:
              "Failed to open AMCAT PDF.",
          };
        }
      },
    );

/* -------------------------------------------------------------------------- */
/* ADMIN AMCAT: GET REPORTS FOR ONE STUDENT                                  */
/* -------------------------------------------------------------------------- */

const adminStudentSchema =
  z.object({
    studentId:
      z.string().min(1),
  });

export const getStudentAmcatReportsForAdmin =
  createServerFn({
    method: "GET",
  })
    .inputValidator(
      (data: unknown) =>
        adminStudentSchema.parse(
          data,
        ),
    )
    .handler(
      async ({ data }) => {
        const session =
          await readSession();

        if (!session) {
          return {
            ok: false as const,
            error:
              "You must be logged in.",
            reports: [],
          };
        }

        if (
          session.role !==
          "admin"
        ) {
          return {
            ok: false as const,
            error:
              "Admin access required.",
            reports: [],
          };
        }

        if (
          !ObjectId.isValid(
            data.studentId,
          )
        ) {
          return {
            ok: false as const,
            error:
              "Invalid student ID.",
            reports: [],
          };
        }

        try {
          const db =
            await getDb();

          const student =
            await db
              .collection("users")
              .findOne({
                _id:
                  new ObjectId(
                    data.studentId,
                  ),

                role:
                  "student",
              });

          if (!student) {
            return {
              ok: false as const,
              error:
                "Student not found.",
              reports: [],
            };
          }

          const reports =
            await db
              .collection(
                "amcat_reports",
              )
              .find({
                student_id:
                  data.studentId,
              })
              .sort({
                uploaded_at:
                  -1,
              })
              .toArray();

          return {
            ok: true as const,

            student: {
              id:
                student[
                  "_id"
                ].toString(),

              fullName:
                (student[
                  "full_name"
                ] as string) ??
                "",

              registerNo:
                (student[
                  "register_no"
                ] as string) ??
                "",
            },

            reports:
              reports.map(
                (report) => ({
                  id:
                    report[
                      "_id"
                    ].toString(),

                  fileName:
                    (report[
                      "file_name"
                    ] as string) ??
                    "AMCAT Report.pdf",

                  fileSize:
                    (report[
                      "file_size"
                    ] as number) ??
                    0,

                  uploadedAt:
                    (report[
                      "uploaded_at"
                    ] as string) ??
                    "",

                  hasPdf:
                    Boolean(
                      report[
                        "pdf_data"
                      ],
                    ),
                }),
              ),
          };
        } catch (error) {
          console.error(
            "Admin student AMCAT error:",
            error,
          );

          return {
            ok: false as const,
            error:
              "Failed to load student AMCAT reports.",
            reports: [],
          };
        }
      },
    );

/* -------------------------------------------------------------------------- */
/* ADMIN AMCAT: ADD REPORT FOR STUDENT                                       */
/* -------------------------------------------------------------------------- */

const adminAmcatUploadSchema =
  z.object({
    studentId:
      z.string().min(1),

    fileName:
      z.string()
        .min(1)
        .max(255),

    fileType:
      z.literal(
        "application/pdf",
      ),

    fileBase64:
      z.string().min(1),
  });

export const uploadAmcatReportForAdmin =
  createServerFn({
    method: "POST",
  })
    .inputValidator(
      (data: unknown) =>
        adminAmcatUploadSchema.parse(
          data,
        ),
    )
    .handler(
      async ({ data }) => {
        const session =
          await readSession();

        if (!session) {
          return {
            ok: false as const,
            error:
              "You must be logged in.",
          };
        }

        if (
          session.role !==
          "admin"
        ) {
          return {
            ok: false as const,
            error:
              "Admin access required.",
          };
        }

        if (
          !ObjectId.isValid(
            data.studentId,
          )
        ) {
          return {
            ok: false as const,
            error:
              "Invalid student ID.",
          };
        }

        try {
          const db =
            await getDb();

          const student =
            await db
              .collection("users")
              .findOne({
                _id:
                  new ObjectId(
                    data.studentId,
                  ),

                role:
                  "student",
              });

          if (!student) {
            return {
              ok: false as const,
              error:
                "Student not found.",
            };
          }

          const pdfBuffer =
            Buffer.from(
              data.fileBase64,
              "base64",
            );

          const MAX_FILE_SIZE =
            10 *
            1024 *
            1024;

          if (
            pdfBuffer.length ===
            0
          ) {
            return {
              ok: false as const,
              error:
                "The PDF is empty.",
            };
          }

          if (
            pdfBuffer.length >
            MAX_FILE_SIZE
          ) {
            return {
              ok: false as const,
              error:
                "PDF must be smaller than 10 MB.",
            };
          }

          const header =
            pdfBuffer
              .subarray(
                0,
                5,
              )
              .toString(
                "ascii",
              );

          if (
            header !==
            "%PDF-"
          ) {
            return {
              ok: false as const,
              error:
                "The uploaded file is not a valid PDF.",
            };
          }

          const result =
            await db
              .collection(
                "amcat_reports",
              )
              .insertOne({
                student_id:
                  data.studentId,

                uploaded_by:
                  session.sub,

                uploaded_by_role:
                  "admin",

                file_name:
                  data.fileName,

                file_type:
                  "application/pdf",

                file_size:
                  pdfBuffer.length,

                uploaded_at:
                  new Date().toISOString(),

                pdf_data:
                  new Binary(
                    pdfBuffer,
                  ),

                storage_type:
                  "mongodb",
              });

          return {
            ok: true as const,

            reportId:
              result.insertedId.toString(),
          };
        } catch (error) {
          console.error(
            "Admin AMCAT upload error:",
            error,
          );

          return {
            ok: false as const,
            error:
              "Failed to add AMCAT report.",
          };
        }
      },
    );

/* -------------------------------------------------------------------------- */
/* ADMIN AMCAT: DELETE REPORT                                                 */
/* -------------------------------------------------------------------------- */

const deleteAmcatReportSchema =
  z.object({
    reportId:
      z.string().min(1),
  });

export const deleteAmcatReportAdmin =
  createServerFn({
    method: "POST",
  })
    .inputValidator(
      (data: unknown) =>
        deleteAmcatReportSchema.parse(
          data,
        ),
    )
    .handler(
      async ({ data }) => {
        const session =
          await readSession();

        if (!session) {
          return {
            ok: false as const,
            error:
              "You must be logged in.",
          };
        }

        if (
          session.role !==
          "admin"
        ) {
          return {
            ok: false as const,
            error:
              "Admin access required.",
          };
        }

        if (
          !ObjectId.isValid(
            data.reportId,
          )
        ) {
          return {
            ok: false as const,
            error:
              "Invalid AMCAT report ID.",
          };
        }

        try {
          const db =
            await getDb();

          const result =
            await db
              .collection(
                "amcat_reports",
              )
              .deleteOne({
                _id:
                  new ObjectId(
                    data.reportId,
                  ),
              });

          if (
            result.deletedCount ===
            0
          ) {
            return {
              ok: false as const,
              error:
                "AMCAT report not found.",
            };
          }

          return {
            ok: true as const,
          };
        } catch (error) {
          console.error(
            "Delete AMCAT report error:",
            error,
          );

          return {
            ok: false as const,
            error:
              "Failed to delete AMCAT report.",
          };
        }
      },
    );

/* -------------------------------------------------------------------------- */
/* ADMIN AMCAT: VIEW PDF                                                      */
/* -------------------------------------------------------------------------- */

export const getAdminAmcatPdf =
  createServerFn({
    method: "GET",
  })
    .inputValidator(
      (data: unknown) =>
        deleteAmcatReportSchema.parse(
          data,
        ),
    )
    .handler(
      async ({ data }) => {
        const session =
          await readSession();

        if (!session) {
          return {
            ok: false as const,
            error:
              "You must be logged in.",
          };
        }

        if (
          session.role !==
          "admin"
        ) {
          return {
            ok: false as const,
            error:
              "Admin access required.",
          };
        }

        if (
          !ObjectId.isValid(
            data.reportId,
          )
        ) {
          return {
            ok: false as const,
            error:
              "Invalid AMCAT report ID.",
          };
        }

        try {
          const db =
            await getDb();

          const report =
            await db
              .collection(
                "amcat_reports",
              )
              .findOne({
                _id:
                  new ObjectId(
                    data.reportId,
                  ),
              });

          if (!report) {
            return {
              ok: false as const,
              error:
                "AMCAT report not found.",
            };
          }

          const storedPdf =
            report[
              "pdf_data"
            ];

          if (!storedPdf) {
            return {
              ok: false as const,
              error:
                "The PDF file is not available.",
            };
          }

          let pdfBuffer:
            Buffer;

          if (
            Buffer.isBuffer(
              storedPdf,
            )
          ) {
            pdfBuffer =
              storedPdf;
          } else if (
            storedPdf instanceof
            Binary
          ) {
            pdfBuffer =
              Buffer.from(
                storedPdf.buffer,
              );
          } else {
            throw new Error(
              "Unable to read stored PDF.",
            );
          }

          return {
            ok: true as const,

            fileName:
              (report[
                "file_name"
              ] as string) ??
              "AMCAT Report.pdf",

            mimeType:
              "application/pdf",

            fileBase64:
              pdfBuffer.toString(
                "base64",
              ),
          };
        } catch (error) {
          console.error(
            "Admin view AMCAT error:",
            error,
          );

          return {
            ok: false as const,
            error:
              "Failed to open AMCAT report.",
          };
        }
      },
    );

/* -------------------------------------------------------------------------- */
/* ADMIN AMCAT: GET ALL REPORTS                                               */
/* -------------------------------------------------------------------------- */

export const getAllAmcatReportsAdmin =
  createServerFn({
    method: "GET",
  }).handler(
    async () => {
      const session =
        await readSession();

      if (!session) {
        return {
          ok: false as const,
          error:
            "You must be logged in.",
          reports: [],
        };
      }

      if (
        session.role !==
        "admin"
      ) {
        return {
          ok: false as const,
          error:
            "Admin access required.",
          reports: [],
        };
      }

      try {
        const db =
          await getDb();

        const reports =
          await db
            .collection(
              "amcat_reports",
            )
            .find({})
            .sort({
              uploaded_at:
                -1,
            })
            .toArray();

        const users =
          db.collection(
            "users",
          );

        const formatted =
          await Promise.all(
            reports.map(
              async (
                report,
              ) => {
                const studentId =
                  report[
                    "student_id"
                  ];

                let student =
                  null;

                if (
                  typeof studentId ===
                    "string" &&
                  ObjectId.isValid(
                    studentId,
                  )
                ) {
                  student =
                    await users.findOne(
                      {
                        _id:
                          new ObjectId(
                            studentId,
                          ),
                      },
                    );
                }

                return {
                  id:
                    report[
                      "_id"
                    ].toString(),

                  fileName:
                    (report[
                      "file_name"
                    ] as string) ??
                    "AMCAT Report.pdf",

                  fileSize:
                    (report[
                      "file_size"
                    ] as number) ??
                    0,

                  uploadedAt:
                    (report[
                      "uploaded_at"
                    ] as string) ??
                    "",

                  studentId:
                    typeof studentId ===
                    "string"
                      ? studentId
                      : "",

                  studentName:
                    (student?.[
                      "full_name"
                    ] as string) ??
                    "Unknown Student",

                  registerNo:
                    (student?.[
                      "register_no"
                    ] as string) ??
                    "Unknown",

                  hasPdf:
                    Boolean(
                      report[
                        "pdf_data"
                      ],
                    ),
                };
              },
            ),
          );

        return {
          ok: true as const,
          reports:
            formatted,
        };
      } catch (error) {
        console.error(
          "Get all AMCAT reports error:",
          error,
        );

        return {
          ok: false as const,
          error:
            "Failed to load AMCAT reports.",
          reports: [],
        };
      }
    },
  );