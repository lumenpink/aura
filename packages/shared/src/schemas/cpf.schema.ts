import { z } from "zod";

const validateCPF = (cpf: string): boolean => {
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let soma = 0;
    let resto;

    // Cálculo do primeiro dígito verificador
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    // Cálculo do segundo dígito verificador
    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;

    return true;
};

export const cpfSchema = z
    .string()
    // Remove qualquer caractere que não seja número
    .transform((val) => val.replace(/\D/g, ""))
    // Valida usando o algoritmo de dígito verificador
    .refine(validateCPF, { message: "CPF inválido" });