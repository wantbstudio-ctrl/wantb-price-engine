import { NextRequest, NextResponse } from "next/server";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx_qWUbnc6voLBkFDBgg_Nst70jerBDBBkhMyV0NlCx8m-HVXtScjKoScFuS4R4eBcG/exec";
async function parseGoogleResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  // Apps Script 권한/배포 문제가 있으면 JSON 대신 HTML 로그인 페이지가 오는 경우가 있음
  if (
    contentType.includes("text/html") ||
    text.includes("<!DOCTYPE html") ||
    text.includes("<html")
  ) {
    return {
      ok: false,
      status: 502,
      payload: {
        ok: false,
        error:
          "Apps Script returned HTML instead of JSON. Check deployment access and exec URL.",
        preview: text.slice(0, 300),
      },
    };
  }

  try {
    const json = JSON.parse(text);
    return {
      ok: true,
      status: response.status,
      payload: json,
    };
  } catch {
    return {
      ok: false,
      status: 502,
      payload: {
        ok: false,
        error: "Invalid JSON response from Apps Script.",
        preview: text.slice(0, 300),
      },
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const incomingUrl = new URL(request.url);
    const action = incomingUrl.searchParams.get("action") || "allAds";

    const targetUrl = new URL(APPS_SCRIPT_URL);
    incomingUrl.searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value);
    });

    if (!targetUrl.searchParams.has("action")) {
      targetUrl.searchParams.set("action", action);
    }

    const response = await fetch(targetUrl.toString(), {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    const result = await parseGoogleResponse(response);

    return NextResponse.json(result.payload, {
      status: result.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to proxy GET request to Apps Script.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
        Accept: "application/json, text/plain, */*",
      },
      body: JSON.stringify(body),
      redirect: "follow",
    });

    const result = await parseGoogleResponse(response);

    return NextResponse.json(result.payload, {
      status: result.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to proxy POST request to Apps Script.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}