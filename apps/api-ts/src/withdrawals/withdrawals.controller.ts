import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import {
  withdrawalCreateSchema,
  withdrawalDecisionSchema,
  withdrawalNoteSchema,
  withdrawalPayoutSchema,
  withdrawalPolicySchema,
  withdrawalQuerySchema,
  withdrawalRefundSchema,
  withdrawalReplacementSchema,
  withdrawalResubmitSchema,
  type WithdrawalCreateInput,
  type WithdrawalDecisionInput,
  type WithdrawalNoteInput,
  type WithdrawalPayoutInput,
  type WithdrawalPolicyInput,
  type WithdrawalQuery,
  type WithdrawalRefundInput,
  type WithdrawalReplacementInput,
  type WithdrawalResubmitInput,
  type User,
} from "@freshphones/contracts";
import { CurrentUser, Requires } from "../auth/access";
import { Validate } from "../http";
import { WithdrawalsService } from "./withdrawals.service";

@Controller("withdrawals")
export class WithdrawalsController {
  constructor(
    @Inject(WithdrawalsService)
    private readonly withdrawals: WithdrawalsService,
  ) {}
  @Get() @Requires("WITHDRAWAL_READ") list(
    @CurrentUser() user: User,
    @Query(new Validate(withdrawalQuerySchema)) query: WithdrawalQuery,
  ) {
    return this.withdrawals.list(user, query);
  }
  @Get("eligibility") @Requires("WITHDRAWAL_SUBMIT") eligibility(
    @CurrentUser() user: User,
  ) {
    return this.withdrawals.eligibility(user);
  }
  @Post() @Requires("WITHDRAWAL_SUBMIT") create(
    @CurrentUser() user: User,
    @Body(new Validate(withdrawalCreateSchema)) input: WithdrawalCreateInput,
  ) {
    return this.withdrawals.create(user, input);
  }
  @Get(":id") @Requires("WITHDRAWAL_READ") get(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.withdrawals.get(user, id);
  }
  @Post(":id/forward")
  @HttpCode(200)
  @Requires("WITHDRAWAL_AGENT_REVIEW")
  forward(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(withdrawalNoteSchema)) input: WithdrawalNoteInput,
  ) {
    return this.withdrawals.forward(user, id, input);
  }
  @Post(":id/decision") @HttpCode(200) @Requires("WITHDRAWAL_DECIDE") decide(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(withdrawalDecisionSchema))
    input: WithdrawalDecisionInput,
  ) {
    return this.withdrawals.decide(user, id, input);
  }
  @Post(":id/resubmit") @HttpCode(200) @Requires("WITHDRAWAL_SUBMIT") resubmit(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(withdrawalResubmitSchema))
    input: WithdrawalResubmitInput,
  ) {
    return this.withdrawals.resubmit(user, id, input);
  }
  @Post(":id/cancel") @HttpCode(200) @Requires("WITHDRAWAL_SUBMIT") cancel(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(withdrawalNoteSchema)) input: WithdrawalNoteInput,
  ) {
    return this.withdrawals.cancel(user, id, input);
  }
  @Post(":id/refund")
  @HttpCode(200)
  @Requires("WITHDRAWAL_REFUND_DECIDE")
  refund(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(withdrawalRefundSchema)) input: WithdrawalRefundInput,
  ) {
    return this.withdrawals.refund(user, id, input);
  }
  @Post(":id/policy") @HttpCode(200) @Requires("WITHDRAWAL_DECIDE") policy(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(withdrawalPolicySchema)) input: WithdrawalPolicyInput,
  ) {
    return this.withdrawals.policy(user, id, input);
  }
  @Get(":id/replacement-preview") @Requires("WITHDRAWAL_READ") preview(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.withdrawals.preview(user, id);
  }
  @Post(":id/replacement-request") @Requires("WITHDRAWAL_AGENT_REVIEW") propose(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(withdrawalReplacementSchema))
    input: WithdrawalReplacementInput,
  ) {
    return this.withdrawals.propose(user, id, input);
  }
  @Post(":id/payout") @HttpCode(200) @Requires("WITHDRAWAL_REFUND_PAY") payout(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new Validate(withdrawalPayoutSchema)) input: WithdrawalPayoutInput,
  ) {
    return this.withdrawals.payout(user, id, input);
  }
}
