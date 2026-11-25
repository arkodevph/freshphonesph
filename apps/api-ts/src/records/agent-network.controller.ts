import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import {
  networkAgentsQuery,
  networkBatchesQuery,
  networkRequestsQuery,
  type NetworkAgentsQuery,
  type NetworkBatchesQuery,
  type NetworkRequestsQuery,
  type User,
} from "@freshphones/contracts";
import { CurrentUser, Requires } from "../auth/access";
import { Validate } from "../http";
import { AgentNetworkService } from "./agent-network.service";

/** Additive reads; the existing network/enrollment endpoints remain compatible. */
@Controller("agent-network")
export class AgentNetworkController {
  constructor(
    @Inject(AgentNetworkService) private readonly network: AgentNetworkService,
  ) {}

  @Get("agents") @Requires("AGENT_NETWORK_READ") agents(
    @CurrentUser() user: User,
    @Query(new Validate(networkAgentsQuery)) query: NetworkAgentsQuery,
  ) {
    return this.network.agents(user, query);
  }

  @Get("agents/:id") @Requires("AGENT_NETWORK_READ") agent(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.network.agent(user, id);
  }

  @Get("batches") @Requires("AGENT_NETWORK_READ") batches(
    @CurrentUser() user: User,
    @Query(new Validate(networkBatchesQuery)) query: NetworkBatchesQuery,
  ) {
    return this.network.batches(user, query);
  }

  @Get("requests") @Requires("AGENT_NETWORK_READ") requests(
    @CurrentUser() user: User,
    @Query(new Validate(networkRequestsQuery)) query: NetworkRequestsQuery,
  ) {
    return this.network.requests(user, query);
  }
}
