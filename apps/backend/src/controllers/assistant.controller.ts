import { Request, Response } from 'express';
import { processBusinessAssistantQuery } from '../services/business-assistant.service';
import { businessAssistantSchema } from '../schemas/assistant.schema';

export const handleBusinessAssistantChat = async (req: Request, res: Response) => {
  try {
    const artisanUserId = req.user?.id;
    if (!artisanUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const validation = businessAssistantSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.format(),
      });
    }

    const result = await processBusinessAssistantQuery(
      artisanUserId,
      validation.data.message,
      validation.data.language
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};
