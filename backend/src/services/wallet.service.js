/**
 * @module services/wallet.service
 * @description Service de gestion du portefeuille (Wallet) ITSOLUTIONS.
 *
 * Ce module gère :
 * - La récupération et la création automatique des wallets
 * - Les opérations de crédit (recharge, remboursement)
 * - Les opérations de débit (abonnement, achat)
 * - L'historique des transactions
 *
 * @security
 * - Toutes les opérations sont atomiques (transactions Prisma)
 * - L'idempotence est assurée par la clé `idempotencyKey`
 * - Le solde est vérifié avant tout débit
 *
 * @example
 * ```javascript
 * const { credit, debit } = require('./wallet.service');
 *
 * // Recharger le wallet
 * const { transaction } = await credit({
 *   userId: user.id,
 *   amount: 25000,
 *   type: 'RECHARGE',
 *   description: 'Recharge Orange Money',
 *   idempotencyKey: `payment-${paymentId}`
 * });
 *
 * // Débiter pour un abonnement
 * const { transaction } = await debit({
 *   userId: user.id,
 *   amount: 23000,
 *   type: 'ROUTER_RENEWAL_DEBIT',
 *   description: 'Renouvellement routeur',
 *   idempotencyKey: `renewal-${routerId}-${month}`
 * });
 * ```
 */

const { prisma } = require("../lib/prisma");
const { Errors } = require("../lib/errors");

/**
 * Récupère ou crée le wallet d'un utilisateur.
 * Le wallet est créé automatiquement lors de la première consultation.
 *
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Wallet>} Objet wallet avec balance et currency
 *
 * @example
 * ```javascript
 * const wallet = await getWallet(userId);
 * console.log(wallet.balance); // 50000 (FC)
 * ```
 */
async function executeWithTx(client, fn) {
  if (typeof client?.$transaction === "function") {
    return client.$transaction(fn);
  }
  return fn(client);
}

/**
 * Récupère ou crée le wallet d'un utilisateur.
 * Le wallet est créé automatiquement lors de la première consultation.
 *
 * @param {string} userId - ID de l'utilisateur
 * @param {object} [client=prisma] - Client Prisma ou transaction Prisma
 * @returns {Promise<Wallet>} Objet wallet avec balance et currency
 */
async function getWallet(userId, client = prisma) {
  return client.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

/**
 * Récupère le wallet avec l'historique des transactions.
 *
 * @param {string} userId - ID de l'utilisateur
 * @param {object} [options] - Options de requête
 * @param {number} [options.limit=50] - Nombre max de transactions à retourner
 * @returns {Promise<{wallet: Wallet, transactions: WalletTransaction[]}>}
 */
async function getWalletWithHistory(userId, { limit = 50 } = {}) {
  const wallet = await getWallet(userId);
  const transactions = await prisma.walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return { wallet, transactions };
}

/**
 * Crédite le wallet d'un utilisateur.
 * Opération atomique et idempotente.
 *
 * @param {object} params - Paramètres de crédit
 * @param {string} params.userId - ID de l'utilisateur
 * @param {number} params.amount - Montant à créditer (positif, en FC)
 * @param {string} params.type - Type de transaction (RECHARGE, REFUND, ADMIN_ADJUSTMENT)
 * @param {string} params.description - Description lisible de la transaction
 * @param {string} [params.idempotencyKey] - Clé d'idempotence pour éviter les doublons
 * @param {string} [params.paymentId] - ID du paiement associé
 * @param {string} [params.relatedRouterId] - ID du routeur associé
 * @param {object} [client=prisma] - Client Prisma ou instance de transaction
 * @returns {Promise<{transaction: WalletTransaction, duplicated: boolean}>}
 */
async function credit({ userId, amount, type, description, idempotencyKey, paymentId, relatedRouterId }, client = prisma) {
  try {
    const result = await executeWithTx(client, async (tx) => {
      if (idempotencyKey) {
        const existing = await tx.walletTransaction.findUnique({
          where: { idempotencyKey },
        });
        if (existing) return { transaction: existing, duplicated: true };
      }

      const wallet = await getWallet(userId, tx);
      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      });
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amount,
          balanceAfter: updated.balance,
          status: "COMPLETED",
          idempotencyKey,
          paymentId,
          relatedRouterId,
          description,
        },
      });
      return { transaction, duplicated: false };
    });
    return result;
  } catch (err) {
    if (err?.code === "P2002" && idempotencyKey) {
      const existing = await prisma.walletTransaction.findUnique({
        where: { idempotencyKey },
      });
      if (existing) return { transaction: existing, duplicated: true };
    }
    throw err;
  }
}

/**
 * Débite le wallet d'un utilisateur.
 * Opération atomique, protégée contre la concurrence et idempotente. Bloqué si solde insuffisant.
 *
 * @param {object} params - Paramètres de débit
 * @param {string} params.userId - ID de l'utilisateur
 * @param {number} params.amount - Montant à débiter (positif, en FC)
 * @param {string} params.type - Type de transaction (ROUTER_CREATION_DEBIT, ROUTER_RENEWAL_DEBIT)
 * @param {string} params.description - Description lisible de la transaction
 * @param {string} [params.idempotencyKey] - Clé d'idempotence pour éviter les doublons
 * @param {string} [params.relatedRouterId] - ID du routeur associé
 * @param {object} [client=prisma] - Client Prisma ou instance de transaction
 * @returns {Promise<{transaction: WalletTransaction, duplicated: boolean}>}
 * @throws {ApiError} WALLET_INSUFFICIENT_BALANCE si le solde est insuffisant
 */
async function debit({ userId, amount, type, description, idempotencyKey, relatedRouterId }, client = prisma) {
  try {
    const result = await executeWithTx(client, async (tx) => {
      if (idempotencyKey) {
        const existing = await tx.walletTransaction.findUnique({
          where: { idempotencyKey },
        });
        if (existing) return { transaction: existing, duplicated: true };
      }

      const wallet = await getWallet(userId, tx);

      // Décrément atomique avec vérification stricte du solde
      const updateResult = await tx.wallet.updateMany({
        where: {
          id: wallet.id,
          balance: { gte: amount },
        },
        data: {
          balance: { decrement: amount },
        },
      });

      if (updateResult.count === 0) {
        const fresh = await tx.wallet.findUnique({ where: { id: wallet.id } });
        const currentBalance = fresh?.balance ?? 0;
        throw Errors.walletInsufficient(amount - currentBalance);
      }

      const freshWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amount: -amount,
          balanceAfter: freshWallet.balance,
          status: "COMPLETED",
          idempotencyKey,
          relatedRouterId,
          description,
        },
      });
      return { transaction, duplicated: false };
    });
    return result;
  } catch (err) {
    if (err?.code === "P2002" && idempotencyKey) {
      const existing = await prisma.walletTransaction.findUnique({
        where: { idempotencyKey },
      });
      if (existing) return { transaction: existing, duplicated: true };
    }
    throw err;
  }
}

module.exports = {
  getWallet,
  getWalletWithHistory,
  credit,
  debit,
};
