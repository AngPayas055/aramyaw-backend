export function getTeamPaymentSummary(registrationFeeCentavos, payments) {
    const amountDueCentavos = payments.at(-1)?.expectedAmountCentavos ?? registrationFeeCentavos;
    const activePayment = payments.find((payment) => payment.status === "pending" || payment.status === "paid");
    const paymentStatus = amountDueCentavos === 0
        ? "not_required"
        : activePayment?.status ?? (payments.length ? "rejected" : "unpaid");
    return { amountDueCentavos, paymentStatus };
}
