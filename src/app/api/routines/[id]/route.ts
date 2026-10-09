import { NextRequest, NextResponse } from "next/server";
import { RoutineRepository } from "@/repositories/RoutineRepository";
import { errorResponse, AppError } from "@/lib/errors";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const owner = request.cookies.get("skinnear-owner")?.value;
    if (!owner) throw new AppError("Saved routine not found in this browser.", 404);
    const routine = await new RoutineRepository().get((await context.params).id, owner);
    if (!routine) throw new AppError("Saved routine not found in this browser.", 404);
    return NextResponse.json(routine);
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const owner = request.cookies.get("skinnear-owner")?.value;
    if (!owner || !await new RoutineRepository().remove((await context.params).id, owner)) throw new AppError("Saved routine not found in this browser.", 404);
    return new NextResponse(null, { status: 204 });
  } catch (error) { return errorResponse(error); }
}
